const db = wx.cloud.database();
const PAGE_SIZE = 10;
const TYPE_OPTIONS = ['可回收', '有害垃圾', '厨余垃圾', '其他垃圾', '混合'];

Page({
  data: {
    list: [],
    loading: false,
    page: 0,
    pageSize: PAGE_SIZE,
    keyword: '',
    showModal: false,
    editItem: {},
    typeOptions: TYPE_OPTIONS,
    typeIndex: 0
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
      ? db.collection('waste_bins').where({ name: db.RegExp({ regexp: keyword, options: 'i' }) })
      : db.collection('waste_bins').where({});

    query.skip(page * PAGE_SIZE)
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
    this.setData({
      showModal: true,
      typeIndex: 0,
      editItem: { name: '', address: '', type: TYPE_OPTIONS[0], longitude: '', latitude: '' }
    });
  },

  openEdit(e) {
    const item = e.currentTarget.dataset.item;
    // 从 GeoPoint 中提取经纬度供表单显示
    const longitude = item.location?.coordinates?.[0] ?? '';
    const latitude  = item.location?.coordinates?.[1] ?? '';
    const typeIndex = TYPE_OPTIONS.indexOf(item.type);
    this.setData({
      showModal: true,
      typeIndex: typeIndex >= 0 ? typeIndex : 0,
      editItem: { ...item, longitude: String(longitude), latitude: String(latitude) }
    });
  },

  closeModal() { this.setData({ showModal: false }); },
  noop() {},

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`editItem.${field}`]: e.detail.value });
  },

  onTypePick(e) {
    const idx = parseInt(e.detail.value);
    this.setData({ typeIndex: idx, 'editItem.type': TYPE_OPTIONS[idx] });
  },

  saveItem() {
    const { editItem } = this.data;
    if (!editItem.name)      return wx.showToast({ title: '请输入名称', icon: 'none' });
    if (!editItem.address)   return wx.showToast({ title: '请输入地址', icon: 'none' });
    if (!editItem.longitude || !editItem.latitude)
      return wx.showToast({ title: '请输入经纬度', icon: 'none' });

    const lng = parseFloat(editItem.longitude);
    const lat = parseFloat(editItem.latitude);
    if (isNaN(lng) || isNaN(lat))
      return wx.showToast({ title: '经纬度格式不正确', icon: 'none' });

    wx.showLoading({ title: '保存中...' });

    // 构造 GeoPoint
    const payload = {
      name: editItem.name,
      address: editItem.address,
      type: editItem.type,
      location: db.Geo.Point(lng, lat)
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
      db.collection('waste_bins').doc(editItem._id).update({ data: payload }).then(done).catch(fail);
    } else {
      db.collection('waste_bins').add({ data: payload }).then(done).catch(fail);
    }
  },

  confirmDelete(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '删除该垃圾桶后不可恢复，确认吗？',
      confirmColor: '#d93025',
      success: res => {
        if (!res.confirm) return;
        wx.showLoading({ title: '删除中...' });
        wx.cloud.callFunction({
          name: 'adminDelete',
          data: { collection: 'waste_bins', docId: id }
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