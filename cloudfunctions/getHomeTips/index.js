// cloudfunctions/getHomeTips/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 获取数据库中贴士的总数
    const countResult = await db.collection('garbage_tips').count()
    const total = countResult.total

    if (total === 0) {
      return {
        success: true,
        data: "让地球更绿，让分类更简单。" // 兜底文字
      }
    }

    // 随机生成一个跳过的数值
    const skip = Math.floor(Math.random() * total)

    // 从数据库中随机取一条记录
    const result = await db.collection('garbage_tips').skip(skip).limit(1).get()

    return {
      success: true,
      data: result.data[0].content
    }
  } catch (e) {
    console.error(e)
    return {
      success: false,
      msg: '获取贴士失败',
      data: "分类一小步，文明一大步。" // 报错时的兜底
    }
  }
}