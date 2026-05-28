const db = wx.cloud.database();
const PAGE_SIZE = 10;

Page({
  data: {
    activeTab: 'posts',
    list: [],
    loading: false,
    page: 0,
    pageSize: PAGE_SIZE
  },

  onLoad() { this.fetchList(); },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.activeTab) return;
    this.setData({ activeTab: tab, page: 0 }, () => this.fetchList());
  },

  fetchList() {
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });
    const { activeTab, page } = this.data;
    const col = activeTab === 'posts' ? 'posts' : 'comments';

    db.collection(col)
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

  confirmDelete(e) {
    const { id, col } = e.currentTarget.dataset;
    const label = col === 'posts' ? '帖子' : '评论';
    wx.showModal({
      title: '确认删除',
      content: `删除该${label}后不可恢复，确认吗？`,
      confirmColor: '#d93025',
      success: res => {
        if (!res.confirm) return;
        wx.showLoading({ title: '删除中...' });
        wx.cloud.callFunction({
          name: 'adminDelete',
          data: { collection: col, docId: id }
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