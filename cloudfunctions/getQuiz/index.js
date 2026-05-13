// cloudfunctions/getQuiz/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const countResult = await db.collection('garbage_quiz').count()
    const total = countResult.total
    if (total === 0) return { success: false, msg: '题库为空' }

    const skip = Math.floor(Math.random() * total)
    const result = await db.collection('garbage_quiz').skip(skip).limit(1).get()

    return {
      success: true,
      data: result.data[0]
    }
  } catch (e) {
    return { success: false, error: e }
  }
}