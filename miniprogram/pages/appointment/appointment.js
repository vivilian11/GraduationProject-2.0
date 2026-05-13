const db = wx.cloud.database();

Page({
  data: {
    currentTab: 0,
    formData: { name: '', phone: '', address: '', garbageName: '' },
    myAppos: []
  },

  onShow() {
    this.fetchMyAppos();
  },

  switchTab(e) {
    this.setData({ currentTab: parseInt(e.currentTarget.dataset.index) });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.data.formData[field] = e.detail.value;
  },

  // 提交预约
  async submitAppo() {
    const { name, phone, address, garbageName } = this.data.formData;
    if (!name || !phone || !address || !garbageName) {
      return wx.showToast({ title: '请填写完整信息', icon: 'none' });
    }

    wx.showLoading({ title: '提交中...' });
    try {
      await db.collection('appointments').add({
        data: {
          ...this.data.formData,
          status: 0, // 0为初始待处理
          createTime: db.serverDate(),
          dateString: new Date().toLocaleString()
        }
      });
      wx.hideLoading();
      wx.showToast({ title: '预约成功' });
      this.setData({ currentTab: 1 }); // 自动跳转到记录页
      this.fetchMyAppos();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '提交失败', icon: 'none' });
    }
  },

  // 获取我的预约记录
  fetchMyAppos() {
    db.collection('appointments')
      .where({ _openid: '{openid}' })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        this.setData({ myAppos: res.data });
      });
  }
});