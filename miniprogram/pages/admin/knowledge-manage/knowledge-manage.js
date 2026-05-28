const db = wx.cloud.database();
const PAGE_SIZE = 10;

Page({
  data: {
    activeTab: 'tips',
    list: [],
    loading: false,
    page: 0,
    pageSize: PAGE_SIZE,
    showModal: false,
    editItem: {}
  },

  onLoad() { this.fetchList(); },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.activeTab) return;
    this.setData({ activeTab: tab, page: 0, showModal: false }, () => this.fetchList());
  },

  fetchList() {
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });
    const col = this.data.activeTab === 'tips' ? 'garbage_tips' : 'garbage_quiz';

    db.collection(col)
      .skip(this.data.page * PAGE_SIZE)
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

  openAdd() {
    const empty = this.data.activeTab === 'tips'
      ? { content: '' }
      : { question: '', answerA: '', answerB: '', correct: 'A' };
    this.setData({ showModal: true, editItem: empty });
  },

  openEdit(e) {
    this.setData({ showModal: true, editItem: { ...e.currentTarget.dataset.item } });
  },

  closeModal() { this.setData({ showModal: false }); },
  noop() {},

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`editItem.${field}`]: e.detail.value });
  },

  onCorrectPick(e) {
    // picker range是['A','B']，value是索引
    this.setData({ 'editItem.correct': e.detail.value === '0' || e.detail.value === 0 ? 'A' : 'B' });
  },

  saveItem() {
    const { editItem, activeTab } = this.data;
    const col = activeTab === 'tips' ? 'garbage_tips' : 'garbage_quiz';
    let payload = {};

    if (activeTab === 'tips') {
      if (!editItem.content) return wx.showToast({ title: '请输入内容', icon: 'none' });
      payload = { content: editItem.content };
    } else {
      if (!editItem.question) return wx.showToast({ title: '请输入题目', icon: 'none' });
      if (!editItem.answerA)  return wx.showToast({ title: '请输入选项A', icon: 'none' });
      if (!editItem.answerB)  return wx.showToast({ title: '请输入选项B', icon: 'none' });
      if (!editItem.correct)  return wx.showToast({ title: '请选择正确答案', icon: 'none' });
      payload = {
        question: editItem.question,
        answerA: editItem.answerA,
        answerB: editItem.answerB,
        correct: editItem.correct
      };
    }

    wx.showLoading({ title: '保存中...' });
    const done = () => {
      wx.hideLoading();
      wx.showToast({ title: '保存成功' });
      this.setData({ showModal: false });
      this.fetchList();
    };
    const fail = err => {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'error' });
      console.error(err);
    };

    if (editItem._id) {
      db.collection(col).doc(editItem._id).update({ data: payload }).then(done).catch(fail);
    } else {
      db.collection(col).add({ data: payload }).then(done).catch(fail);
    }
  },

  confirmDelete(e) {
    const { id, col } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确认吗？',
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
