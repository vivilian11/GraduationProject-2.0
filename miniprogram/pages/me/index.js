const db = wx.cloud.database();

Page({
  data: {
    userInfo: {},
    shortOpenId: ''
  },

  onShow() {
    this.fetchUserInfo();
  },

  // 获取用户信息
  fetchUserInfo() {
    wx.showLoading({ title: '同步中...' });
    db.collection('users').where({ _openid: '{openid}' }).get().then(res => {
      wx.hideLoading();
      if (res.data.length > 0) {
        const user = res.data[0];
        this.setData({
          userInfo: user,
          // 截取OpenID后6位展示
          shortOpenId: user._openid.substring(user._openid.length - 6).toUpperCase()
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('获取用户信息失败', err);
    });
  },

  // 统一跳转函数
  navTo(e) {
    const url = e.currentTarget.dataset.url;
    wx.navigateTo({
      url: `/pages/${url}/${url}`
    });
  },

  // 跳转管理员后台
  navToAdmin() {
    if (!this.data.userInfo.isAdmin) return;
    wx.navigateTo({
      url: '/pages/admin/admin'
    });
  }
});