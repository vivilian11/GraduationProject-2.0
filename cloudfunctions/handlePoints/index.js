// cloudfunctions/handlePoints/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { actionType, quizCorrect = false, badgeName, badgeId } = event
  const { OPENID } = cloud.getWXContext()

  // 1. 积分配置
  const POINT_CONFIG = {
    'identify': 2,   // 识别垃圾加2分
    'checkin': 1,    // 签到加1分
    'quiz': 2,       // 答题正确加2分
    'redeem': -10    // 兑换勋章减10分
  }

  let pointsToAdd = 0
  let actionDesc = ''

  // 2. 匹配动作类型
  switch (actionType) {
    case 'identify':
      pointsToAdd = POINT_CONFIG.identify
      actionDesc = '识别垃圾奖励'
      break
    case 'checkin':
      pointsToAdd = POINT_CONFIG.checkin
      actionDesc = '每日签到奖励'
      break
    case 'quiz':
      pointsToAdd = quizCorrect ? POINT_CONFIG.quiz : 0
      actionDesc = quizCorrect ? '问答正确奖励' : '问答错误无分'
      break
    case 'redeem':
      pointsToAdd = POINT_CONFIG.redeem // 等于 -10
      actionDesc = `兑换勋章：${badgeName || '未知勋章'}`
      break
    default:
      return { success: false, msg: '未知的加分行为' }
  }

  // 答错题且没有加分直接返回
  if (pointsToAdd === 0 && actionType === 'quiz') {
    return { success: true, pointsAdded: 0, msg: '很遗憾，答错啦' }
  }

  try {
    const todayStr = new Date().toLocaleDateString('zh-CN') // 规范日期格式

    // ─── 开启事务处理 ───
    const transaction = await db.startTransaction()

    try {
      // 3. 各种前置检查
      const userRes = await transaction.collection('users').where({ _openid: OPENID }).get()
      const userExists = userRes.data.length > 0
      const currentPoints = userExists ? (userRes.data[0].points || 0) : 0

      // A. 签到检查：今天是否已签到
      if (actionType === 'checkin') {
        const checkRes = await transaction.collection('point_logs').where({
          _openid: OPENID,
          actionType: 'checkin',
          dateString: todayStr
        }).get()

        if (checkRes.data.length > 0) {
          await transaction.rollback()
          return { success: false, msg: '今日已经签到过了哦' }
        }
      }

      // B. 兑换检查：积分是否足够
      if (actionType === 'redeem') {
        if (currentPoints < 10) {
          await transaction.rollback()
          return { success: false, msg: '积分不足，无法兑换' }
        }
        // 记录勋章拥有情况
        await transaction.collection('user_badges').add({
          data: {
            _openid: OPENID,
            badgeId: badgeId,
            badgeName: badgeName,
            unlockTime: db.serverDate()
          }
        })
      }

      // 4. 更新流水日志
      await transaction.collection('point_logs').add({
        data: {
          _openid: OPENID,
          actionType,
          pointsAdded: pointsToAdd,
          actionDesc,
          dateString: todayStr,
          createTime: db.serverDate()
        }
      })

      // 5. 更新用户总分
      if (userExists) {
        await transaction.collection('users').doc(userRes.data[0]._id).update({
          data: {
            points: _.inc(pointsToAdd),
            updateTime: db.serverDate()
          }
        })
      } else {
        await transaction.collection('users').add({
          data: {
            _openid: OPENID,
            points: pointsToAdd,
            updateTime: db.serverDate()
          }
        })
      }

      // 提交事务
      await transaction.commit()
      return { success: true, pointsAdded: pointsToAdd }

    } catch (e) {
      // 发生任何错误则回滚
      await transaction.rollback()
      throw e
    }
  } catch (e) {
    console.error('[handlePoints] 错误:', e)
    return { success: false, msg: '处理失败', error: e.message }
  }
}