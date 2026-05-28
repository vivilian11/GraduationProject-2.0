const db = wx.cloud.database();
const PAGE_SIZE = 10;

Page({
  data: {
    list: [],
    loading: false,
    page: 0,
    pageSize: PAGE_SIZE,
    filterStatus: -1  // -1=全部
  },

  onLoad() {
    this.fetchList();
  },

  // 切换筛选状态
  setFilter(e) {
    const status = parseInt(e.currentTarget.dataset.status);
    this.setData({ filterStatus: status, page: 0 }, () => {
      this.fetchList();
    });
  },

  // 拉取列表
  fetchList() {
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });

    const { filterStatus, page } = this.data;
    let query = db.collection('appointments');
    let condition = filterStatus === -1 ? {} : { status: filterStatus };

    query.where(condition)
      .orderBy('createTime', 'desc')
      .skip(page * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .get()
      .then(res => {
        wx.hideLoading();
        this.setData({ list: res.data, loading: false });
      })
      .catch(err => {
        wx.hideLoading();
        this.setData({ loading: false });
        wx.showToast({ title: '加载失败', icon: 'error' });
        console.error(err);
      });
  },

  // 推进状态（0→1→2）
  nextStatus(e) {
    const { id, status } = e.currentTarget.dataset;
    const nextSt = status + 1;
    const label = nextSt === 1 ? '处理中' : '已回收';

    wx.showModal({
      title: '确认操作',
      content: `将此预约标记为「${label}」？`,
      success: res => {
        if (!res.confirm) return;
        wx.showLoading({ title: '更新中...' });
        db.collection('appointments').doc(id).update({
          data: { status: nextSt }
        }).then(() => {
          wx.hideLoading();
          wx.showToast({ title: '更新成功' });
          this.fetchList();
        }).catch(err => {
          wx.hideLoading();
          wx.showToast({ title: '更新失败', icon: 'error' });
          console.error(err);
        });
      }
    });
  },

  // 删除确认
  confirmDelete(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定要删除这条预约吗？',
      confirmColor: '#d93025',
      success: res => {
        if (!res.confirm) return;
        this.deleteRecord(id);
      }
    });
  },

  // 调用云函数删除
  deleteRecord(docId) {
    wx.showLoading({ title: '删除中...' });
    wx.cloud.callFunction({
      name: 'adminDelete',
      data: { collection: 'appointments', docId }
    }).then(res => {
      wx.hideLoading();
      if (res.result.success) {
        wx.showToast({ title: '已删除' });
        this.fetchList();
      } else {
        wx.showToast({ title: res.result.error || '删除失败', icon: 'error' });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '删除失败', icon: 'error' });
      console.error(err);
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
