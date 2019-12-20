const request = require('request');
const querystring = require('querystring');
const log = require('./../modules/log');
const CONFIG = require('./../modules/config');

class qbittorrent {
    constructor(baseURL, username, password) {
        this._baseURL = baseURL;
        this._cookie = '';

        this.getCookie(username, password).then(() => this.addNewCategory('JAVClub'));
    }

    getRequestPromise(uri)
    {
        log.debug('GET ' + uri);
        return new Promise((resolve, reject) => {
            request({
                method: 'get',
                url: this._baseURL + uri,
                headers: {
                    'Cookie': this._cookie,
                },
            },(error, response, body) => {
                if (error)
                    reject(error);

                log.debug('GET Body: ' + body);
                resolve(response);
            });
        });
    }

    postRequestPromise(uri, body, type = 'application/x-www-form-urlencoded', formData = {})
    {
        log.debug('POST ' + uri);
        return new Promise((resolve, reject) => {
            let data = {
                method: 'post',
                url: this._baseURL + uri,
                headers: {
                    'Content-Type': type,
                    'Cookie': this._cookie,
                },
                body: body,
            };

            if (formData)
            {
                data.formData = formData;
                delete data.body;
                log.debug('POST Form Data: ' + JSON.stringify(formData));
            }

            log.debug('POST Data: ' + JSON.stringify(data));

            request(data,(error, response, body) => {
                if (error)
                    reject(error);

                log.debug('POST Body: ' + body);
                resolve(response);
            });
        });
    }

    getCookie(username, password)
    {
        return new Promise((resolve) => {
            request.post(this._baseURL + '/api/v2/auth/login',{
                headers: {
                    'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                },
                body: 'username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password)
            },(error, response) => {
                if (response.body == 'Ok.')
                {
                    response.headers['set-cookie'].forEach((item) => 
                        this._cookie = this._cookie + item.split(';')[0] + ';'
                    );
                    this._cookie = this._cookie.substr(0, this._cookie.length - 1);
                    log.info('Cookie: ' + this._cookie);
                    resolve();
                } else {
                    log.error('Qbittorrent login failed.');
                    process.exit(1);
                }
            });
        });
    }

    getTorrentList()
    {
        log.info('Getting torrent list');
        return this.getRequestPromise('/query/torrents?limit=1000&category=JAVClub');
    }

    getTorrentInfo(hash)
    {
        log.info('Getting torrent ' + hash + ' info');
        return this.getRequestPromise('/query/propertiesGeneral/' + hash);
    }

    getTorrentContent(hash)
    {
        log.info('Getting torrent ' + hash + ' content');
        return this.getRequestPromise('/query/propertiesFiles/' + hash);
    }

    addTorrentLink(url)
    {
        return this.postRequestPromise('/command/download', '','multipart/form-data',{
            urls: url,
            category: 'JAVClub',
            upLimit: CONFIG['upLimit']
        });
    }

    addNewCategory(name)
    {
        log.info('Adding category ' + name);
        return this.postRequestPromise('/command/addCategory', querystring.stringify({category: name}));
    }

    pauseTorrent(hash)
    {
        log.info('Pausing torrent ' + hash);
        return this.postRequestPromise('/command/pause', querystring.stringify({hash: hash}));      
    }

    resumeTorrent(hash)
    {
        log.info('Resuming torrent ' + hash);
        return this.postRequestPromise('/command/resume', querystring.stringify({hash: hash}));  
    }
}

module.exports = qbittorrent;