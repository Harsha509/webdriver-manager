import * as os from 'os';
import * as path from 'path';

import { Flag } from '../flags';
import * as xmlUtils from './downloader/xml_utils';
import { getVersion, VersionList } from './version_list';


export const CHROME_VERSION: Flag = {
  flagName: 'versions.chrome',
  type: 'string',
  description: 'Optional chrome driver version (use \'latest\' to get the most recent version)',
  default: 'latest'
};

export class ChromeDriver {
  requestUrl = 'https://chromedriver.storage.googleapis.com/';
  outDir = path.resolve('.');
  fileName = 'chromedriver.xml';
  osType = os.type();
  osArch = os.arch();

  // TODO(cnishina): WIP, should complete the async binary download.
  /**
   * Should update the cache and download, find the version to download,
   * then download that binary.
   *
   * @param version Optional to provide the version number or latest.
   */
  async updateBinary(version?: string): Promise<boolean> {
    let jsonObj = await xmlUtils.updateXml(this.requestUrl,
      path.resolve(this.outDir, this.fileName));
    let versionList = convertXmlToVersionList(this.fileName);
    let versionObj = getVersion(versionList, version);
    let partialUrl = getPartialUrl(versionObj, this.osType, this.osArch);
    return true;
  }
}

/**
 * Returns a list of versions and the partial url paths.
 * 
 * @param fileName the location of the xml file to read.
 * @returns the version list from the xml file.
 */
export function convertXmlToVersionList(fileName: string): VersionList | null {
  let xmlJs = xmlUtils.readXml(fileName);
  if (!xmlJs) {
    return null;
  }
  let versionList: VersionList = {};
  for (let content of xmlJs['ListBucketResult']['Contents']) {
    let key = content['Key'][0] as string;
    if (key.includes('.zip')) {
      let version = key.split('/')[0] + '.0';
      let size = +content['Size'][0];
      if (!versionList[version]) {
        versionList[version] = {};
      }
      versionList[version][key] = size;
    }
    
  }
  return versionList;
}

/**
 * Helps translate the os type and arch to the download name associated
 * with composing the download link.
 * 
 * @param ostype The operating stystem type.
 * @param osarch The chip architecture.
 * 
 * @returns The download name associated with composing the download link. 
 */
export function osHelper(ostype: string, osarch: string): string {
  if (ostype === 'Darwin') {
    return 'macos';
  } else if (ostype === 'Windows_NT') {
    if (osarch === 'x64')  {
      return 'win64';
    }
    else if (osarch === 'x32') {
      return 'win32';
    }
  } else {
    if (osarch === 'x64') {
      return 'linux64';
    } else if (osarch === 'x32') {
      return 'linux32';
    }
  }
  return null;
}

export function getPartialUrl(versionObj: {[key:string]: number},
    ostype: string, osarch: string): [string, number]|null {
  let osMatch = osHelper(ostype, osarch);
  for (let versionKey of Object.keys(versionObj)) {
    if (versionKey.includes(osMatch)) {
      return [versionKey, versionObj[versionKey]];
    }
  }
  return null;
}