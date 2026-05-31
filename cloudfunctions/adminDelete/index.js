const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 允许删除操作的集合白名单（安全限制，防止误删系统集合）
const ALLOWED_COLLECTIONS = [
  'appointments',
  'comments',
  'garbage_atlas',
  'garbage_quiz',
  'garbage_records',
  'garbage_tips',
  'point_logs',
  'posts',
  'user_badges',
  'users',
  'waste_bins'
];

exports.main = async (event, context) => {
  const { collection, docId } = event;

  // 1. 校验调用者是否为管理员
  const { OPENID } = cloud.getWXContext();
  const userQuery = await db.collection('users').where({ _openid: OPENID }).get();
  if (userQuery.data.length === 0 || userQuery.data[0].isAdmin !== true) {
    return { success: false, error: '无管理员权限' };
  }

  // 2. 校验集合名是否在白名单内
  if (!ALLOWED_COLLECTIONS.includes(collection)) {
    return { success: false, error: `不允许操作的集合: ${collection}` };
  }

  // 3. 校验文档ID
  if (!docId || typeof docId !== 'string') {
    return { success: false, error: '无效的文档ID' };
  }

  // 4. 执行删除
  try {
    await db.collection(collection).doc(docId).remove();

    // 删除帖子时，级联删除该帖子下的所有评论
    if (collection === 'posts') {
      const commentsRes = await db.collection('comments').where({ postId: docId }).get();
      if (commentsRes.data.length > 0) {
        await Promise.all(
          commentsRes.data.map(comment => db.collection('comments').doc(comment._id).remove())
        );
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};