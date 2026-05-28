// 1. 引入配置文件获取 Key
const config = require('../../config.js');
const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    latitude: 31.86, // 默认坐标
    longitude: 118.50,
    markers: [],
    selectedPlace: null
  },

  onLoad() {
    this.initLocation();
  },

  // 初始化定位并获取附近点位
  initLocation() {
    wx.showLoading({ title: '定位中...' });
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const { latitude, longitude } = res;
        this.setData({ latitude, longitude });
        this.fetchNearbyBins(latitude, longitude);
      },
      fail: () => {
        wx.hideLoading();
        wx.showModal({
          title: '提示',
          content: '请授权位置信息，否则无法查看附近垃圾桶',
          showCancel: false
        });
      }
    });
  },

  // 获取附近 500米内的垃圾桶
  fetchNearbyBins(lat, lng) {
    db.collection('waste_bins').where({
      location: _.geoNear({
        geometry: db.Geo.Point(lng, lat), // 注意：经度在前，纬度在后
        maxDistance: 500 
      })
    }).get().then(res => {
      const markers = res.data.map(item => {
        return {
          id: item._id,
          latitude: item.location.latitude,
          longitude: item.location.longitude,
          title: item.name,
          iconPath: '/images/map/bin_1.png', 
          width: 34,
          height: 34,
          data: item
        }
      });
      this.setData({ markers });
      wx.hideLoading();
    }).catch(err => {
      console.error("查询失败", err);
      wx.hideLoading();
    });
  },

  // 点击图标弹出详情
  onMarkerTap(e) {
    const markerId = e.detail.markerId;
    const marker = this.data.markers.find(m => m.id === markerId);
    if (marker) {
      this.setData({ selectedPlace: marker.data });
    }
  },

  // 步行导航（调起原生地图）
  goNavigation() {
    const place = this.data.selectedPlace;
    if (!place) return;

    // 微信会自动根据地理位置提供最合适的路线建议
    wx.openLocation({
      latitude: place.location.latitude,
      longitude: place.location.longitude,
      name: place.name,
      address: place.address,
      scale: 18
    });
  }
});