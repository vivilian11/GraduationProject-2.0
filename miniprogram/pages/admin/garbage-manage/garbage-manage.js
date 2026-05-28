const db = wx.cloud.database();
const PAGE_SIZE = 10;

const TYPE_OPTIONS = [
  { label: '可回收物', value: 0 },
  { label: '有害垃圾', value: 1 },
  { label: '厨余垃圾', value: 2 },
  { label: '其他垃圾', value: 3 }
];

Page({
  data: {
    list: [],
    loading: false,
    page: 0,
    pageSize: PAGE_SIZE,
    keyword: '',
    showModal: false,
    editItem: {},
    typeOptions: TYPE_OPTIONS
  },

  onLoad() { this.fetchList(); },

  onSearch(e) {
    this.setData({ keyword: e.detail.value, page: 0 }, () => this.fetchList());
  },

  fetchList() {
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });
    const { keyword, page } = this.data;
    let col = db.collection('garbage_atlas');
    let query = keyword
      ? col.where({ name: db.RegExp({ regexp: keyword, options: 'i' }) })
      : col.where({});

    query.orderBy('name', 'asc')
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

  // 打开新增弹窗
  openAdd() {
    this.setData({ showModal: true, editItem: { name: '', tip: '', type: 0, typeLabel: '可回收物', imageUrl: '' } });
  },

  // 打开编辑弹窗
  openEdit(e) {
    this.setData({ showModal: true, editItem: { ...e.currentTarget.dataset.item } });
  },

  closeModal() { this.setData({ showModal: false }); },
  noop() {},

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`editItem.${field}`]: e.detail.value });
  },

  onTypePick(e) {
    const idx = e.detail.value;
    const picked = TYPE_OPTIONS[idx];
    this.setData({ 'editItem.type': picked.value, 'editItem.typeLabel': picked.label });
  },

  // 选择并上传图片
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: res => {
        const tempPath = res.tempFiles[0].tempFilePath;
        const cloudPath = `garbage_atlas/${Date.now()}.jpg`;
        wx.showLoading({ title: '上传中...' });
        wx.cloud.uploadFile({
          cloudPath,
          filePath: tempPath,
          success: upload => {
            wx.hideLoading();
            this.setData({ 'editItem.imageUrl': upload.fileID });
          },
          fail: err => {
            wx.hideLoading();
            wx.showToast({ title: '上传失败', icon: 'error' });
            console.error(err);
          }
        });
      }
    });
  },

  // 保存（新增或更新）
  saveItem() {
    const { editItem } = this.data;
    if (!editItem.name) return wx.showToast({ title: '请输入名称', icon: 'none' });
    if (!editItem.tip)  return wx.showToast({ title: '请输入投放提示', icon: 'none' });

    wx.showLoading({ title: '保存中...' });
    const payload = {
      name: editItem.name,
      tip: editItem.tip,
      type: editItem.type,
      typeLabel: editItem.typeLabel,
      imageUrl: editItem.imageUrl || ''
    };

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
      db.collection('garbage_atlas').doc(editItem._id).update({ data: payload }).then(done).catch(fail);
    } else {
      db.collection('garbage_atlas').add({ data: payload }).then(done).catch(fail);
    }
  },

  confirmDelete(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确认吗？',
      confirmColor: '#d93025',
      success: res => {
        if (!res.confirm) return;
        wx.showLoading({ title: '删除中...' });
        wx.cloud.callFunction({
          name: 'adminDelete',
          data: { collection: 'garbage_atlas', docId: id }
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