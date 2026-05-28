const db = wx.cloud.database();

Page({
  data: {
    isAdmin: false,
    hasChecked: false
  },

  onLoad: function () {
    this.checkAdminRole();
  },

  // 管理员权限校验（彻底移除云函数，使用前端安全占位符直查）
  checkAdminRole: function () {
    wx.showLoading({ title: '权限校验中...', mask: true });

    // 直接查 users 集合，利用 '{openid}' 自动匹配当前用户，告别云函数报错
    db.collection('users').where({
      _openid: '{openid}'
    }).get().then(userRes => {
      wx.hideLoading();

      if (userRes.data.length > 0) {
        const user = userRes.data[0];
        
        // 兼容你数据库里 isAdmin 是 Boolean(true) 还是 String('true')
        if (user.isAdmin === true || user.isAdmin === 'true') {
          this.setData({ isAdmin: true, hasChecked: true });
          return; // 鉴权通过，留在当前页面渲染 WXML
        }
      }

      // 如果没查到数据，或者 isAdmin 不是 true，则踢出
      this.rejectAccess();

    }).catch(err => {
      wx.hideLoading();
      this.setData({ hasChecked: true });
      console.error("数据库查询异常：", err);
      this.rejectAccess();
    });
  },

  // 统一的越权踢出逻辑
  rejectAccess: function() {
    this.setData({ isAdmin: false, hasChecked: true });
    wx.showModal({
      title: '提示',
      content: '您的账号暂无管理员权限。',
      showCancel: false,
      success() {
        // 先尝试返回上一页，如果不行就跳回首页
        wx.navigateBack({
          fail: () => {
            wx.switchTab({ url: '/pages/index/index' });
          }
        });
      }
    });
  },

  // 保持你原有的九宫格跳转逻辑
  navTo: function(e) {
    const pageName = e.currentTarget.dataset.page;
    wx.navigateTo({
      url: `/pages/admin/${pageName}/${pageName}`
    });
  }
});