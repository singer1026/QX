var url = $request.url;
//console.log(url);
var accessToken = $prefs.valueForKey('ali_access_token') ?? '';
var driveId = $prefs.valueForKey('ali_drive_id') ?? '';              
var shareToken = $prefs.valueForKey('ali_share_token') ?? '';  

const shareId = "BKKPcDS7zmz";

var headers = {
    'Referer': 'https://www.aliyundrive.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36',
    'Content-Type': 'application/json'
};
var myResponse = {
    status: 'HTTP/1.1 200 OK',
};
var obj = {};

function hex2str(hex) {
    var trimedStr = hex.trim();
    var rawStr = trimedStr.substr(0, 2).toLowerCase() === "0x" ? trimedStr.substr(2) : trimedStr;
    var len = rawStr.length;
    if (len % 2 !== 0) {
        return "";
    }
    var curCharCode;
    var resultStr = [];
    for (var i = 0; i < len; i = i + 2) {
        curCharCode = parseInt(rawStr.substr(i, 2), 16);
        resultStr.push(String.fromCharCode(curCharCode));
    }
    return resultStr.join("");
}

if (url.indexOf('/webapi/auth.cgi') != -1) {
    // 登录接口，替换为刷新refresh token
    const body = $request.body;
    const password = body.match(/passwd=([^&]*)/)[1];
    const refreshToken = $prefs.valueForKey('ali_refresh_token') ?? password;
    const data = {
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
    };
    const req = {
        url: 'https://auth.aliyundrive.com/v2/account/token',
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
    };
    $task.fetch(req).then(res => {
        const json = JSON.parse(res.body);
        if (json.refresh_token && json.access_token && json.default_drive_id) {
            $prefs.setValueForKey(json.refresh_token, 'ali_refresh_token');
            $prefs.setValueForKey(json.access_token, 'ali_access_token');
            $prefs.setValueForKey(json.default_drive_id, 'ali_drive_id');
            obj = {
                success: true,
                data: {
                    sid: json.access_token
                }
            };
            myResponse.body = JSON.stringify(obj);
            const data2 = {
                share_id: shareId
            }
            const req2 = {
                url: 'https://api.aliyundrive.com/v2/share_link/get_share_token',
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data2)
            };
            $task.fetch(req2).then(res => {
                const json = JSON.parse(res.body);
                if (json.share_token) {
                    $prefs.setValueForKey(json.share_token, 'ali_share_token');
                    $done(myResponse);
                }else{
                    $done(myResponse);
                }
            });
            
        } else {
            $done();
        }
    });
} else if (url.indexOf('/webapi/entry.cgi') != -1) {
    const body = $request.body;
    if (typeof(body) === 'string') {
        // 当前的请求为加载目录
        if (body.indexOf('list_share') != -1 || body.indexOf('method=list') != -1) {
            // headers.authorization = 'Bearer ' + accessToken;
            headers["x-share-token"] = shareToken;
            const parentId = body.match(/folder_path=([^&]*)/) === null ? "root" : body.match(/folder_path=([^&]*)/)[1];
            var isRootFolder = parentId === "root";
            const data = {
                "image_thumbnail_process": "image/resize,w_160/format,jpeg",
		        "image_url_process":       "image/resize,w_1920/format,jpeg",
                "video_thumbnail_process": "video/snapshot,t_1000,f_jpg,ar_auto,w_300",
                share_id: shareId,
                parent_file_id: parentId,
                limit: 200
            };
            const req = {
                url: 'https://api.aliyundrive.com/adrive/v3/file/list',
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data)
            };
            $task.fetch(req).then(res => {
                const items = JSON.parse(res.body).items;
                var files = [];
                items.forEach(function(item) {
                    const file = {
                        isdir: item.type === 'folder',
                        path: item.file_id,
                        name: item.name,
                        driveId: item.drive_id,
                        additional: {
                            size: item.size
                        }
                    };
                    files.push(file);
                });
                const result = isRootFolder ? {
                    total: 0,
                    offset: 0,
                    shares: files
                } : {
                    total: 0,
                    offset: 0,
                    files: files
                };
                obj = {
                    success: true,
                    data: result
                };
                myResponse.body = JSON.stringify(obj);
                $done(myResponse);
            });
        }
    } else {
        $done();
    }
} else if (url.indexOf('fbdownload') != -1) {
    const hex = url.match(/dlink=%22(.*)%22/)[1];
    const fileid = hex2str(hex);
    // const body = {
    //     drive_id: driveId,
    //     expire_sec: 14400,
    //     file_id: fileid
    // };
    const body = {
        "drive_id": "254244",
        "file_id":  fileid,
        "expire_sec": 600,
        "share_id":   shareId
      }
    headers.authorization = 'Bearer ' + accessToken;
    const req = {
        url: 'https://api.aliyundrive.com/v2/file/get_share_link_download_url',
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    };
    $task.fetch(req).then(res => {
        const link = JSON.parse(res.body).url;
        $done({
            status: "HTTP/1.1 302 Found",
            headers: {
                "Location": link
            }
        });
    });
}