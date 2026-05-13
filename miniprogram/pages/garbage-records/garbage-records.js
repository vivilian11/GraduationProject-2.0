// pages/garbage-records/garbage-records.js
const db = wx.cloud.database();

Page({
  data: {
    records: []
  },

  onShow() { // 建议用 onShow，这样从首页识别完切回来能立刻看到更新
    this.fetchRecords();
  },

  fetchRecords() {
    wx.showLoading({ title: '刷新记录...' });
    db.collection('garbage_records') 
      .where({ _openid: '{openid}' })
      .orderBy('createTime', 'desc') // 按时间最新排列
      .limit(20)
      .get()
      .then(res => {
        this.setData({ records: res.data });
        wx.hideLoading();
      })
      .catch(err => {
        console.error('获取记录失败', err);
        wx.hideLoading();
      });
  }
});