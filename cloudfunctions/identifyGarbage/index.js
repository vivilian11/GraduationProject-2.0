// cloudfunctions/identifyGarbage/index.js
const cloud = require('wx-server-sdk')
const axios = require('axios')
const qs = require('qs')
const config = require('./config.json')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const { TIAN_API_KEY, BAIDU_API_KEY, BAIDU_SECRET_KEY } = config
const TYPE_MAP = ['可回收物', '有害垃圾', '厨余垃圾', '其他垃圾']

exports.main = async (event, context) => {
  const { mode, content, fileID } = event
  console.log('收到请求模式:', mode)

  try {
    switch (mode) {

      case 'text': {
        if (!content || !content.trim()) {
          return { success: false, msg: '请输入垃圾名称' }
        }
        return await tianClassify(content.trim())
      }

      case 'image': {
        if (!fileID) {
          return { success: false, msg: '缺少 fileID 参数' }
        }
        const fileRes = await cloud.downloadFile({ fileID })
        const imgBase64 = fileRes.fileContent.toString('base64')
        console.log('图片下载成功，准备调用百度识图')
        const keyword = await baiduIdentify(imgBase64)
        console.log('百度识别成功，关键词:', keyword)
        return await tianClassify(keyword)
      }

      default:
        return { success: false, msg: '参数错误' }
    }
  } catch (e) {
    console.error('【错误详情】', e.config ? `请求地址: ${e.config.url}` : '', e.message)
    return {
      success: false,
      msg: '识别过程出错',
      error: e.message,
      tip: '请检查云函数日志中的【错误详情】'
    }
  }
}

async function getBaiduToken() {
  console.log('正在获取百度 Token...')
  const res = await axios.get('https://aip.baidubce.com/oauth/2.0/token', {
    params: {
      grant_type: 'client_credentials',
      client_id: BAIDU_API_KEY,
      client_secret: BAIDU_SECRET_KEY
    }
  })
  if (!res.data.access_token) {
    throw new Error('百度 Token 获取失败，请检查 API Key 和 Secret Key')
  }
  return res.data.access_token
}

async function baiduIdentify(imageBase64) {
  const token = await getBaiduToken()
  const res = await axios.post(
    `https://aip.baidubce.com/rest/2.0/image-classify/v2/advanced_general?access_token=${token}`,
    qs.stringify({ image: imageBase64 }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )
  console.log('【百度】返回：', JSON.stringify(res.data))
  if (res.data.error_code) {
    throw new Error(`百度识别错误 ${res.data.error_code}：${res.data.error_msg}`)
  }
  if (res.data.result && res.data.result.length > 0) return res.data.result[0].keyword
  throw new Error('未能识别图片内容，请确保画面清晰且主体明显')
}

async function tianClassify(word) {
  console.log('正在调用天行分类，词条:', word)
  const res = await axios.post(
    'https://apis.tianapi.com/lajifenlei/index',
    qs.stringify({ key: TIAN_API_KEY, word }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )
  console.log('【天行】返回：', JSON.stringify(res.data))
  const list = res.data?.result?.list
  if (res.data.code === 200 && Array.isArray(list) && list.length > 0) {
    const info = list[0]
    return {
      success: true,
      data: {
        name: info.name,
        type: TYPE_MAP[info.type] ?? '其他垃圾',
        tip: info.tip
      }
    }
  }
  return { success: false, msg: `未匹配到"${word}"的分类，请尝试更换关键词` }
}