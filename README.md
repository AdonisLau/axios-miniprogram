# 基于axios的小程序适配器 #

## 用法 ##

* 下载个[axios](https://github.com/axios/axios/edit/master/dist/axios.min.js)
* 下载个`axios`的[小程序适配器](https://github.com/AdonisLau/axios-miniprogram/edit/master/adapter.js)
* 安装一下

```javascript
import axios from './axios';
import adapter from './adapter';

let instance = axios.create({
  adapter
});
```

## 使用 ##

> 除了`config`增加`onHeaderReceived`之外，常规的http请求请查看[axios文档](https://github.com/axios/axios)。新增以下两个方法供上传和下载使用。

```javascript
// 上传
const promise = instance({
  method: 'upload',             // 上传专属方法
  url: 'xxx',                   // 开发者服务器地址
  name: 'file',                 // 文件对应的 key，开发者在服务端可以通过这个 key 获取文件的二进制内容
  filePath: 'xxx',              // 要上传文件资源的路径 (本地路径)
  formData: {},                 // 额外参数 
  onUploadProgress(e) {         // 获取上传进度   
    console.log(e);
  }
});

// 下载
const promise = instance({
  method: 'download',           // 下载专属方法
  url: 'xxx',                   // 下载资源的 url
  filePath: 'xxx',              // 指定文件下载后存储的路径 (本地路径)
  onDownloadProgress(e) {       // 获取下载进度
    console.log(e);
  }
});

/**
 * res返回 { tempFilePath: 'xxx', filePath: 'xxx' }
 **/
promise.then(res => {

});


```