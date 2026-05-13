const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    currentTab: 'feed',
    posts: [],
    rankList: [],
    userInfo: {}
  },

  onShow() {
    this.fetchUserInfo();
    this.fetchData();
  },

  // 1. 获取当前用户信息（用于评论）
  fetchUserInfo() {
    db.collection('users').where({ _openid: '{openid}' }).get().then(res => {
      if (res.data.length > 0) this.setData({ userInfo: res.data[0] });
    });
  },

  // 2. 统一刷新数据
  fetchData() {
    if (this.data.currentTab === 'feed') {
      this.fetchPosts();
    } else {
      this.fetchRankList();
    }
  },

  // 3. 获取帖子及关联评论
  async fetchPosts() {
    wx.showLoading({ title: '加载中' });
    const res = await db.collection('posts').orderBy('createTime', 'desc').get();
    let posts = res.data;

    // 关联查询评论
    const promises = posts.map(async (post) => {
      const commentRes = await db.collection('comments')
        .where({ postId: post._id })
        .orderBy('createTime', 'asc')
        .get();
      post.comments = commentRes.data;
      return post;
    });

    const finalPosts = await Promise.all(promises);
    this.setData({ posts: finalPosts });
    wx.hideLoading();
  },

  // 4. 获取排行榜
  fetchRankList() {
    wx.cloud.callFunction({
      name: 'getRankList',
      success: res => {
        if (res.result.success) {
          this.setData({
            rankList: res.result.data
          });
        }
      },
      fail: err => {
        console.error('云函数调用失败', err);
      }
    });
  },

  // 5. 点赞逻辑
  likePost(e) {
    const { id, index } = e.currentTarget.dataset;
    db.collection('posts').doc(id).update({
      data: { likeCount: _.inc(1) }
    }).then(() => {
      let posts = this.data.posts;
      posts[index].likeCount = (posts[index].likeCount || 0) + 1;
      this.setData({ posts });
      wx.showToast({ title: '已点赞', icon: 'none' });
    });
  },

  // 6. 评论逻辑
  onCommentTap(e) {
    const postId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '发表评论',
      editable: true,
      placeholderText: '文明评论，绿色生活...',
      success: (res) => {
        if (res.confirm && res.content) {
          this.addComment(postId, res.content);
        }
      }
    });
  },

  async addComment(postId, content) {
    await db.collection('comments').add({
      data: {
        postId,
        content,
        authorName: this.data.userInfo.nickName || '环保卫士',
        createTime: db.serverDate()
      }
    });
    this.fetchPosts(); // 重新拉取列表显示评论
  },

  // 7. 其他交互
  switchTab(e) {
    this.setData({ currentTab: e.currentTarget.dataset.tab }, () => this.fetchData());
  },
  navToPublish() {
    wx.navigateTo({ url: '/pages/publish/publish' });
  },
  previewImg(e) {
    wx.previewImage({ current: e.currentTarget.dataset.current, urls: e.currentTarget.dataset.urls });
  }
});