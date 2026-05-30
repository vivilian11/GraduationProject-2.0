const db = wx.cloud.database();
const PAGE_SIZE = 10;

// 状态值映射
const STATUS_MAP = {
  0: '审核中',
  1: '审核通过',
  2: '审核驳回'
};

Page({
  data: {
    activeTab: 'posts',
    statusFilter: -1, // -1=全部, 0=审核中, 1=通过, 2=驳回
    list: [],
    loading: false,
    page: 0,
    pageSize: PAGE_SIZE,
    STATUS_MAP
  },

  onLoad() { this.fetchList(); },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.activeTab) return;
    this.setData({ activeTab: tab, page: 0, statusFilter: -1 }, () => this.fetchList());
  },

  switchStatusFilter(e) {
    const val = parseInt(e.currentTarget.dataset.val);
    if (val === this.data.statusFilter) return;
    this.setData({ statusFilter: val, page: 0 }, () => this.fetchList());
  },

  fetchList() {
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });
    const { activeTab, page, statusFilter } = this.data;
    const col = activeTab === 'posts' ? 'posts' : 'comments';

    let query = db.collection(col);
    if (statusFilter !== -1) {
      query = query.where({ status: statusFilter });
    }

    query
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

  // 审核通过
  approveItem(e) {
    const { id, col } = e.currentTarget.dataset;
    this.updateStatus(id, col, 1, '审核通过');
  },

  // 审核驳回
  rejectItem(e) {
    const { id, col } = e.currentTarget.dataset;
    this.updateStatus(id, col, 2, '驳回');
  },

  updateStatus(id, col, status, label) {
    wx.showModal({
      title: '确认操作',
      content: `确认将该${col === 'posts' ? '帖子' : '评论'}标记为"${label}"吗？`,
      confirmColor: status === 1 ? '#1a73e8' : '#d93025',
      success: res => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中...' });
        db.collection(col).doc(id).update({
          data: { status }
        }).then(() => {
          wx.hideLoading();
          wx.showToast({ title: `已${label}` });
          this.fetchList();
        }).catch(err => {
          wx.hideLoading();
          wx.showToast({ title: '操作失败', icon: 'error' });
          console.error(err);
        });
      }
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
