import open from 'open';
import { remote, shell } from 'electron';
import { parse as parseURL } from 'url';
import path from 'path';
import { CONFIG, isRunningTestCafeProcess, allowedHttp } from '$Constants';
import { logger } from '$Logger';
import { urlIsAllowedBySafe } from './utils/safeHelpers';

// const isForLocalServer = ( parsedUrlObject ) =>
//     parsedUrlObject.protocol === 'localhost:' || parsedUrlObject.hostname === '127.0.0.1';

const blockNonSAFERequests = () => {
    const filter = {
        urls: ['*://*']
    };
    const httpRegExp = new RegExp( '^http' );

    const safeSession = remote.session.fromPartition( CONFIG.SAFE_PARTITION );

    safeSession.webRequest.onBeforeRequest( filter, ( details, callback ) => {
    //  testcafe needs access to inject code
        if ( isRunningTestCafeProcess ) {
            callback( {} );
            return;
        }

        if ( urlIsAllowedBySafe( details.url ) ) {
            logger.info( `Allowing url ${details.url}` );
            callback( {} );
            return;
        }

        // HACK for idMgr and Patter. until:
        // https://github.com/parcel-bundler/parcel/issues/1663
        if ( details.url.includes( 'font_148784_v4ggb6wrjmkotj4i' ) ) {
            const thePath = parseURL( details.url ).path;
            const ext = path.extname( thePath );

            const newUrl = `http://localhost:${CONFIG.PORT}/dummy/iconfont${ext}`;
            callback( { redirectURL: newUrl } );
            return;
        }

        if ( httpRegExp.test( details.url ) ) {
            if ( allowedHttp.includes( details.url ) ) {
                try {
                    open( details.url );
                } catch ( e ) {
                    logger.error( e );
                }
            }
        }

        logger.error( 'Blocked URL:', details.url );
        callback( { cancel: true } );
    } );
};

export default blockNonSAFERequests;
