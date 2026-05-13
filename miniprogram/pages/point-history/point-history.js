const db = wx.cloud.database();

Page({
  data: {
    logs: [],
    loading: true
  },

  onLoad() {
    this.fetchPointLogs();
  },

  fetchPointLogs() {
    wx.showLoading({ title: '加载中...' });
    
    // 查询 point_logs 集合
    db.collection('point_logs')
      .where({
        _openid: '{openid}' // 云数据库会自动替换为当前用户的 openid
      })
      .orderBy('createTime', 'desc') // 按照创建时间倒序
      .get()
      .then(res => {
        wx.hideLoading();
        this.setData({
          logs: res.data,
          loading: false
        });
      })
      .catch(err => {
        wx.hideLoading();
        console.error('获取积分明细失败', err);
        wx.showToast({ title: '加载失败', icon: 'none' });
      });
  }
});