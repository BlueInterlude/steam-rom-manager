import * as fs from 'fs-extra'
import fetch, { AbortError } from 'node-fetch';
import { Resolver } from 'dns';
import { decodeFile } from './encode-file'

export class ImageDownloader {
  private dnsResolver = new Resolver();
  private timeout: number = 10000;
  constructor() {
    console.log("constructor call")
    this.dnsResolver.setServers(['1.1.1.1', '8.8.8.8']);
  }

  async downloadAndSaveImage(imageUrl: string, filePath: string) {
    if(imageUrl.startsWith('file://')) {
      return await fs.copyFile(decodeFile(imageUrl), filePath);
    } else {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      try {
        const {resolved, host} = await this.resolveDNS(imageUrl)
        console.log("resolved", resolved)
        const res = await fetch(resolved, {
          signal: controller.signal,
          method: 'GET',
          headers: {
            Host: host
          }
        });
        const arrayBuff = await res.arrayBuffer();
        fs.outputFileSync(filePath, Buffer.from(arrayBuff))
      } catch(error) {
        if(error instanceof AbortError) {
          throw `Request timed out after ${this.timeout} milliseconds.`
        } else {
          throw error;
        }
      }
    }
  }

  resolveDNS(imageUrl: string) {
    return new Promise<{resolved: string, host: string}>((resolve,reject)=> {
      const url = new URL(imageUrl);
      const { host, pathname, protocol } = url;
      this.dnsResolver.resolve(host, (err, addresses)=>{
        if(err || !addresses.length) {
          reject(err)
        } else {
          resolve({
            resolved: `${protocol}//${addresses[0]}${pathname}`,
            host: host
          })
        }
      })
    })
  }
}


