
本系统主要提供  erc20 下的 token 存款（包括归集）/取款 服务



对外提供 http rest api 接口 ：
参考xxx 文档
1.
2.
3. 
。。。。


如果接收到存款，根据 xx 规则调用 callback 接口，参数是。。。
如果发生xxxx动作， 根据 xx 规则调用 callback 接口，参数是。。。


钱包地址/私钥管理方法： 
xxxxxxxxxxx


存款处理流程： 
如果发现有存款，N个确认后就认为存款成功。 


服务器上有2 个组件： 

geth 服务  ( web3.js 直接访问 本地geth 服务的 http 接口 )

nodejs 服务

leaf你测试的时候就用第三方提供的geth 服务