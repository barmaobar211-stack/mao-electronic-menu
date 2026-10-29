// Vercel same-origin gateway to the MAO data service. No credentials in frontend source.
module.exports = async (req,res) => {
  const path=String(req.query.path||'');
  if(!/^(health|menu|auth\/(login|logout)|orders(?:\/[a-f0-9-]+)?|admin\/(me|menu|orders|users)(?:\/[a-zA-Z0-9-]+)?)$/.test(path)){res.status(404).json({error:'Маршрут не найден'});return;}
  if(!['GET','POST','PATCH'].includes(req.method)){res.status(405).end();return;}
  const headers={'Accept':'application/json'};
  if(req.headers.origin)headers.Origin=req.headers.origin;
  const cookie=(req.headers.cookie||'').match(/(?:^|;\s*)mao_session=[a-f0-9]{64}(?:;|$)/);
  if(cookie)headers.Cookie=cookie[0].replace(/^;\s*/,'');
  if(req.headers['x-order-token'])headers['X-Order-Token']=req.headers['x-order-token'];
  let body;
  if(req.method!=='GET'){headers['Content-Type']='application/json';body=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});if(body.length>20000){res.status(413).json({error:'Слишком большой запрос'});return;}}
  try{
    const upstream=await fetch('https://mao-order-system.attilaalkiss.chatgpt.site/api/'+path,{method:req.method,headers,body,signal:AbortSignal.timeout(14000),redirect:'error'});
    if(!(upstream.headers.get('content-type')||'').includes('application/json')){res.status(503).json({error:'Сервис заказов временно недоступен. Корзина сохранена; позовите сотрудника.'});return;}
    const cookies=upstream.headers.getSetCookie?.()||[];
    if(cookies.length)res.setHeader('Set-Cookie',cookies);
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.status(upstream.status).send(await upstream.text());
  }catch{res.status(503).json({error:'Нет связи с сервисом заказов. Корзина сохранена. Попробуйте ещё раз или позовите сотрудника.'});}
};
