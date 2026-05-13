const db = wx.cloud.database();

Page({
  data: {
    content: '',
    images: [], // 存储的是本地临时路径
    userInfo: {}
  },

  onLoad() {
    this.fetchUserInfo();
  },

  // 获取发布者的头像昵称
  fetchUserInfo() {
    db.collection('users').where({ _openid: '{openid}' }).get().then(res => {
      if (res.data.length > 0) {
        this.setData({ userInfo: res.data[0] });
      }
    });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  // 1. 选择图片
  chooseImage() {
    wx.chooseImage({
      count: 9 - this.data.images.length,
      sizeType: ['compressed'], // 选压缩图，省空间
      sourceType: ['album', 'camera'],
      success: res => {
        this.setData({
          images: this.data.images.concat(res.tempFilePaths)
        });
      }
    });
  },

  // 2. 移除图片
  removeImage(e) {
    const index = e.currentTarget.dataset.index;
    let images = this.data.images;
    images.splice(index, 1);
    this.setData({ images });
  },

  // 3. 执行发布
  async onPublish() {
    if (!this.data.content && this.data.images.length === 0) return;

    wx.showLoading({ title: '发布中...', mask: true });

    try {
      // 第一步：上传所有图片到云存储
      const uploadPromises = this.data.images.map((path, index) => {
        const cloudPath = `posts/${Date.now()}-${index}.png`;
        return wx.cloud.uploadFile({
          cloudPath,
          filePath: path
        });
      });
      
      const uploadResults = await Promise.all(uploadPromises);
      const fileIDs = uploadResults.map(res => res.fileID);

      // 第二步：将帖子信息存入数据库
      await db.collection('posts').add({
        data: {
          content: this.data.content,
          images: fileIDs,
          authorName: this.data.userInfo.nickName || '环保小卫士',
          authorAvatar: this.data.userInfo.avatarUrl || '/images/default-avatar.png',
          likeCount: 0,
          createTime: db.serverDate(),
          dateString: new Date().toLocaleString()
        }
      });

      wx.hideLoading();
      wx.showToast({ title: '发布成功', icon: 'success' });
      
      // 第三步：返回社区页并刷新
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '发布失败', icon: 'none' });
      console.error(err);
    }
  },

  goBack() {
    wx.navigateBack();
  }
});