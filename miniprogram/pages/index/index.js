const db = wx.cloud.database();

Page({
  data: {
    totalPoints: 0,
    currentTip: '正在加载贴士...',

    // 分类图鉴相关数据
    atlasVisible: false,
    atlasSearchKeyword: '',
    atlasAllList: [],   // 存放从数据库拉取的原始列表
    atlasShowList: [],  // 存放过滤后展示的列表
    atlasLoading: false,
  },

  onLoad() {
    this.fetchUserPoints();
    this.fetchRandomTip();
  },

  // ─── 1. 获取用户积分 ───────────────────────────────────────────
  fetchUserPoints() {
    db.collection('users')
      .where({ _openid: '{openid}' })
      .get()
      .then(res => {
        if (res.data.length > 0) {
          this.setData({ totalPoints: res.data[0].points || 0 });
        }
      })
      .catch(err => console.error('获取积分失败', err));
  },

  // ─── 2. 随机环保小贴士 ──────────────────────────────────────────
  fetchRandomTip() {
    wx.cloud.callFunction({
      name: 'getHomeTips',
      success: res => {
        if (res.result && res.result.success) {
          this.setData({ currentTip: res.result.data });
        }
      },
      fail: err => {
        this.setData({ currentTip: '垃圾分类，从我做起。' });
      }
    });
  },

  // ─── 3. 分类图鉴逻辑 (修复图片显示问题) ──────────────────────────
  onOpenAtlas() {
    this.setData({ atlasVisible: true });
    // 如果还没加载过数据，或者列表为空，则去加载
    if (this.data.atlasAllList.length === 0) {
      this.fetchAtlasData();
    }
  },

  onCloseAtlas() {
    this.setData({ atlasVisible: false });
  },

  fetchAtlasData() {
    this.setData({ atlasLoading: true });
    db.collection('garbage_atlas').get().then(res => {
      // 核心修改：不再调用 getTempFileURL
      // 直接使用数据库里的 imageUrl (格式为 cloud://...)
      const list = res.data.map(item => {
        return {
          ...item,
          displayUrl: item.imageUrl // 创建一个专门用于展示的字段
        }
      });

      this.setData({
        atlasAllList: list,
        atlasShowList: list,
        atlasLoading: false
      });
      console.log('图鉴数据加载成功:', list);
    }).catch(err => {
      console.error('获取图鉴失败', err);
      this.setData({ atlasLoading: false });
    });
  },

  // 图鉴搜索逻辑
  onAtlasSearch(e) {
    const keyword = e.detail.value.toLowerCase();
    const filtered = this.data.atlasAllList.filter(item => 
      item.name.toLowerCase().includes(keyword) || 
      item.typeLabel.toLowerCase().includes(keyword)
    );
    this.setData({
      atlasSearchKeyword: keyword,
      atlasShowList: filtered
    });
  },

  onAtlasClear() {
    this.setData({
      atlasSearchKeyword: '',
      atlasShowList: this.data.atlasAllList
    });
  },

  // ─── 4. 垃圾识别逻辑 ──────────────────────────────────────────
  onTakePhoto() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        wx.showLoading({ title: '上传识别中...' });
        this.uploadImageToCloud(tempFilePath);
      }
    });
  },

  onTextIdentify() {
    wx.showModal({
      title: '文字识别',
      placeholderText: '请输入垃圾名称',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content) {
          this.callIdentifyFunction('text', res.content);
        }
      }
    });
  },

  uploadImageToCloud(filePath) {
    const cloudPath = `garbage-images/${Date.now()}-${Math.floor(Math.random()*1000)}.jpg`;
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success: res => {
        this.callIdentifyFunction('image', res.fileID);
      },
      fail: () => { wx.hideLoading(); }
    });
  },

  callIdentifyFunction(mode, content) {
    wx.showLoading({ title: '识别中...' });
    wx.cloud.callFunction({
      name: 'identifyGarbage',
      data: { mode, content, fileID: mode === 'image' ? content : '' },
      success: res => {
        wx.hideLoading();
        if (res.result && res.result.success) {
          const data = res.result.data;
        // 将记录存入数据库
        // 这里的 content 在 image 模式下就是 FileID
        db.collection('garbage_records').add({
          data: {
            name: data.name,           // 垃圾名称
            type: data.type,           // 垃圾类型
            imgUrl: mode === 'image' ? content : '', // 只有拍照才有图片
            createTime: db.serverDate(), // 服务器时间，方便排序
            dateString: new Date().toLocaleString() // 本地时间显示
          }
        }).then(res => {
          console.log('识别记录已自动保存');
        }).catch(err => {
          console.error('保存记录失败', err);
        });

          wx.showModal({
            title: `识别结果：${data.name}`,
            content: `属于：${data.type}\n提示：${data.tip}`,
            showCancel: false,
            confirmText: '打卡加分',
            success: () => {
              this.callHandlePoints('identify'); // 识别成功加2分
            }
          });
        } else {
          wx.showToast({ title: '未识别到分类', icon: 'none' });
        }
      }
    });
  },

  // ─── 5. 签到与问答 ────────────────────────────────────────────
  onCheckIn() {
    wx.showLoading({ title: '签到中...' });
    this.callHandlePoints('checkin'); // 签到加1分
  },

  onStartQuiz() {
    wx.showLoading({ title: '获取题目...' });
    wx.cloud.callFunction({
      name: 'getQuiz',
      success: res => {
        wx.hideLoading();
        if (res.result && res.result.success) {
          const quiz = res.result.data;
          wx.showModal({
            title: '环保挑战',
            content: quiz.question,
            cancelText: quiz.answerB,
            confirmText: quiz.answerA,
            success: (r) => {
              if (r.confirm) this.checkQuizAnswer('A', quiz.correct, quiz);
              else if (r.cancel) this.checkQuizAnswer('B', quiz.correct, quiz);
            }
          });
        }
      }
    });
  },

  checkQuizAnswer(userChoice, correctAnswer, quiz) {
    if (userChoice === correctAnswer) {
      this.callHandlePoints('quiz', true); // 答对加2分
    } else {
      const correctText = correctAnswer === 'A' ? quiz.answerA : quiz.answerB;
      wx.showToast({ title: `答错啦！正确答案是：${correctText}`, icon: 'none', duration: 2500 });
    }
  },

  // ─── 6. 积分统一调度中心 ──────────────────────────────────────
  callHandlePoints(actionType, quizCorrect = false) {
    wx.cloud.callFunction({
      name: 'handlePoints',
      data: { actionType, quizCorrect },
      success: res => {
        wx.hideLoading();
        if (res.result && res.result.success) {
          wx.showToast({ title: `获得 ${res.result.pointsAdded} 积分！` });
          this.fetchUserPoints(); // 刷新显示的积分
        } else {
          wx.showToast({ title: res.result.msg || '操作失败', icon: 'none' });
        }
      }
    });
  }
});