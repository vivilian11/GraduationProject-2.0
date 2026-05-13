const db = wx.cloud.database();

Page({
  data: {
    totalPoints: 0,
    showModal: false,
    selectedBadge: null,
    // 勋章配置表
    badgeList: [
      { id: 1, name: '小蓬花', threshold: 5, icon: '/images/achievements/badge_1.png', desc: '开启环保之路的纪念' },
      { id: 2, name: '桃花', threshold: 10, icon: '/images/achievements/badge_2.png', desc: '已经掌握了基本的分类知识' },
      { id: 3, name: '兰花', threshold: 20, icon: '/images/achievements/badge_3.png', desc: '社区里的环保领头人' },
      { id: 4, name: '灯笼果', icon: '/images/achievements/badge_4.png', desc: '为减少塑料污染做出贡献' },
      { id: 5, name: '格桑花', icon: '/images/achievements/badge_5.png', desc: '节约纸张，保护森林资源' },
      { id: 6, name: '金盏花', icon: '/images/achievements/badge_6.png', desc: '让金属废品重新焕发光彩' },
      { id: 7, name: '野花', icon: '/images/achievements/badge_7.png', desc: '玻璃回收，循环利用的先锋' },
      { id: 8, name: '樱花', icon: '/images/achievements/badge_8.png', desc: '传播绿色理念的优秀使者' },
      { id: 9, name: '多瓣莲花', icon: '/images/achievements/badge_9.png', desc: '守护我们唯一的蓝色家园' }
    ]
  },

  onLoad() {
    this.refreshData();
  },

  // 统一刷新数据：积分 + 已拥有勋章
  async refreshData() {
    wx.showLoading({ title: '加载中...' });
    try {
      await Promise.all([
        this.fetchUserPoints(),
        this.fetchUserBadges()
      ]);
    } catch (err) {
      console.error('数据加载失败', err);
    }
    wx.hideLoading();
  },

  // 1. 获取当前用户积分
  fetchUserPoints() {
    return db.collection('users').where({ _openid: '{openid}' }).get().then(res => {
      if (res.data.length > 0) {
        this.setData({ totalPoints: res.data[0].points || 0 });
      }
    });
  },

  // 2. 获取用户已经兑换的勋章 ID 列表
  fetchUserBadges() {
    return db.collection('user_badges').where({ _openid: '{openid}' }).get().then(res => {
      const ownedIds = res.data.map(item => item.badgeId);
      const newList = this.data.badgeList.map(badge => {
        // 如果 ID 在已拥有列表中，标记为已拥有
        return {
          ...badge,
          isOwned: ownedIds.includes(badge.id)
        };
      });
      this.setData({ badgeList: newList });
    });
  },

  // 3. 处理勋章点击事件
  onBadgeTap(e) {
    const item = e.currentTarget.dataset.item;
    
    // 判断是否已经点亮（自动或已买）
    const isUnlocked = (item.id <= 3 && this.data.totalPoints >= item.threshold) || (item.id > 3 && item.isOwned);
    
    if (isUnlocked) {
      wx.showModal({
        title: item.name,
        content: item.desc,
        showCancel: false,
        confirmText: '太棒了'
      });
      return;
    }

    // 如果是 4-9 号勋章且未拥有，弹出兑换框
    if (item.id > 3) {
      this.setData({
        selectedBadge: item,
        showModal: true
      });
    } else {
      // 1-3 号勋章未达到积分
      wx.showToast({
        title: `积分达到 ${item.threshold} 自动解锁`,
        icon: 'none'
      });
    }
  },

  // 4. 关闭弹窗
  closeModal() {
    this.setData({ showModal: false });
  },

  // 5. 执行兑换逻辑
  confirmRedeem() {
    if (this.data.totalPoints < 10) {
      wx.showToast({ title: '积分不足哦', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '兑换中...' });
    const badge = this.data.selectedBadge;

    wx.cloud.callFunction({
      name: 'handlePoints',
      data: {
        actionType: 'redeem',
        badgeId: badge.id,
        badgeName: badge.name
      },
      success: res => {
        wx.hideLoading();
        if (res.result && res.result.success) {
          wx.showToast({ title: '兑换成功！', icon: 'success' });
          this.setData({ showModal: false });
          this.refreshData(); // 重新刷新界面
        } else {
          wx.showToast({ title: res.result.msg || '兑换失败', icon: 'none' });
        }
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  }
});