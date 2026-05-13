// cloudfunctions/getRankList/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 云函数端直接从 users 集合抓取分数最高的前 20 名
    const res = await db.collection('users')
      .field({
        nickName: true,
        avatarUrl: true,
        points: true
      })
      .orderBy('points', 'desc')
      .limit(20)
      .get()

    return {
      success: true,
      data: res.data
    }
  } catch (e) {
    return {
      success: false,
      msg: '获取排行榜失败',
      error: e
    }
  }
}