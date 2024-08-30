
let body = $response.body;
if (body) {
  var bodyJson = JSON.parse(body);
  let data = bodyJson["data"];
  let splash_ad = bodyJson["splash_ad"];
  splash_ad["enabled"] = false
  splash_ad["ad"] = {}
  body = JSON.stringify(bodyJson);
  $done({ body });
} else $done({});
