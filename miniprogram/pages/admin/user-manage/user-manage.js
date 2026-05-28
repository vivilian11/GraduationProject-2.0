const db = wx.cloud.database();
const PAGE_SIZE = 10;

Page({
  data: {
    list: [],
    loading: false,
    page: 0,
    pageSize: PAGE_SIZE,
    keyword: '',
    expandedId: null,
    pointLogs: {},   // { userId: [...logs] }
    badges: {},      // { userId: [...badges] }
    loadingLogs: false
  },

  onLoad() { this.fetchList(); },

  onSearch(e) {
    this.setData({ keyword: e.detail.value, page: 0 }, () => this.fetchList());
  },

  fetchList() {
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });
    const { keyword, page } = this.data;
    let query = keyword
      ? db.collection('users').where({ nickName: db.RegExp({ regexp: keyword, options: 'i' }) })
      : db.collection('users').where({});

    query.orderBy('updateTime', 'desc')
      .skip(page * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .get()
      .then(res => {
        wx.hideLoading();
        this.setData({ list: res.data, loading: false, expandedId: null });
      })
      .catch(err => {
        wx.hideLoading();
        this.setData({ loading: false });
        wx.showToast({ title: '加载失败', icon: 'error' });
        console.error(err);
      });
  },

  // 展开/收起用户详情，同时拉取积分记录和徽章
  toggleDetail(e) {
    const { id } = e.currentTarget.dataset;
    if (this.data.expandedId === id) {
      this.setData({ expandedId: null });
      return;
    }
    this.setData({ expandedId: id });

    // 已经加载过就不重复请求
    if (this.data.pointLogs[id]) return;

    this.setData({ loadingLogs: true });
    const logsPromise = db.collection('point_logs')
      .where({ _openid: this.data.list.find(u => u._id === id)?._openid })
      .orderBy('createTime', 'desc')
      .limit(20)
      .get();

    const badgesPromise = db.collection('user_badges')
      .where({ _openid: this.data.list.find(u => u._id === id)?._openid })
      .orderBy('createTime', 'desc')
      .limit(20)
      .get();

    Promise.all([logsPromise, badgesPromise]).then(([logsRes, badgesRes]) => {
      this.setData({
        loadingLogs: false,
        [`pointLogs.${id}`]: logsRes.data,
        [`badges.${id}`]: badgesRes.data
      });
    }).catch(err => {
      this.setData({ loadingLogs: false });
      console.error('加载详情失败', err);
    });
  },

  confirmDelete(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '⚠️ 确认删除用户',
      content: '删除用户后不可恢复，该操作仅删除用户记录，不会删除其发布的内容。确认吗？',
      confirmColor: '#d93025',
      success: res => {
        if (!res.confirm) return;
        wx.showLoading({ title: '删除中...' });
        wx.cloud.callFunction({
          name: 'adminDelete',
          data: { collection: 'users', docId: id }
        }).then(r => {
          wx.hideLoading();
          if (r.result.success) {
            wx.showToast({ title: '已删除' });
            this.fetchList();
          } else {
            wx.showToast({ title: r.result.error || '删除失败', icon: 'error' });
          }
        }).catch(err => {
          wx.hideLoading();
          wx.showToast({ title: '删除失败', icon: 'error' });
          console.error(err);
        });
      }
    });
  },

  prevPage() {
    if (this.data.page === 0) return;
    this.setData({ page: this.data.page - 1 }, () => this.fetchList());
  },
  nextPage() {
    if (this.data.list.length < PAGE_SIZE) return;
    this.setData({ page: this.data.page + 1 }, () => this.fetchList());
  }
});
