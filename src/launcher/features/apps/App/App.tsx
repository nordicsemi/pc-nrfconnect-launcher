/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useRef } from 'react';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import DropdownButton from 'react-bootstrap/DropdownButton';
import ListGroup from 'react-bootstrap/ListGroup';

import { OFFICIAL } from '../../../../common/sources';
import { isInstalled, isUpdatable, isWithdrawn } from '../../../../ipc/apps';
import formatPublishTimestamp from '../../../util/formatTimestamp';
import Col from '../../layout/Col';
import Row from '../../layout/Row';
import { type DisplayedApp } from '../appsSlice';
import AppIcon from './AppIcon';
import AppProgress from './AppProgress';
import CreateShortcut from './CreateShortcut';
import InstallApp from './InstallApp';
import InstallOtherVersion from './InstallOtherVersion';
import OpenApp from './OpenApp';
import OpenHomepage from './OpenHomepage';
import ShowReleaseNotes from './ShowReleaseNotes';
import UninstallApp from './UninstallApp';
import UpdateApp from './UpdateApp';

import styles from './app.module.scss';

const useHighlightOnInstallation = (app: DisplayedApp) => {
    // The bootstrap component ListGroup expects an anchor element ref
    const itemRef = useRef<HTMLAnchorElement>(null);
    const appIsInstalled = useRef<boolean>(isInstalled(app));

    useEffect(() => {
        if (!itemRef.current) return;

        let timeout: NodeJS.Timeout;
        if (!appIsInstalled.current && isInstalled(app)) {
            itemRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
            itemRef.current.classList.add(styles.highlight);
            timeout = setTimeout(
                () => itemRef.current?.classList.remove(styles.highlight),
                3000,
            );
        }
        appIsInstalled.current = isInstalled(app);

        return () => {
            if (!timeout) return;
            clearTimeout(timeout);
        };

        // While we won't have the newest app reference, it will never be undefined and we only read the .installed property
        // This also makes it so that this useEffect is only triggered once instead of multiple times which would make the cleanup function lead to problems with styles
        // @ts-expect-error Typescript can't find this property somehow
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [app.installed]);

    return itemRef;
};

const App = ({ app }: { app: DisplayedApp }) => {
    const itemRef = useHighlightOnInstallation(app);

    return (
        <ListGroup.Item ref={itemRef}>
            <Row noGutters className="tw-flex-nowrap tw-py-1">
                <Col
                    fixedSize
                    noPadding
                    className="tw-my-2 tw-mr-4 tw-flex tw-items-start"
                >
                    <AppIcon app={app} />
                </Col>
                <Col noPadding className="tw-w-full tw-flex-initial">
                    <div>{app.displayName || app.name}</div>
                    <div className="tw-text-sm tw-text-gray-600">
                        {app.description}
                    </div>
                    <div className="tw-text-sm tw-text-gray-200">
                        {app.source}
                        {isInstalled(app) && <>, v{app.currentVersion}</>}
                        {isInstalled(app) && app.source !== OFFICIAL && (
                            <>
                                {formatPublishTimestamp(
                                    app.installed.publishTimestamp,
                                )}
                            </>
                        )}

                        {isUpdatable(app) && (
                            <> (v{app.latestVersion} available)</>
                        )}
                        {!isInstalled(app) &&
                            !isWithdrawn(app) &&
                            app.latestVersion && <>, v{app.latestVersion}</>}
                        {isWithdrawn(app) && (
                            <>, not available for download anymore</>
                        )}
                    </div>
                </Col>
                <Col
                    fixedSize
                    className="tw-my-4 tw-ml-auto tw-flex tw-items-center tw-pr-0"
                >
                    <ButtonToolbar className="wide-btns">
                        <UpdateApp app={app} className="tw-min-w-20" />
                        <OpenApp app={app} className="tw-min-w-20" />
                        <InstallApp app={app} className="tw-min-w-20" />
                        <DropdownButton
                            variant={
                                isInstalled(app)
                                    ? 'outline-primary'
                                    : 'outline-secondary'
                            }
                            title=""
                        >
                            <OpenHomepage app={app} />
                            <ShowReleaseNotes app={app} />
                            <CreateShortcut app={app} />
                            <InstallOtherVersion app={app} />
                            <UninstallApp app={app} />
                        </DropdownButton>
                    </ButtonToolbar>
                </Col>
            </Row>
            <AppProgress app={app} />
        </ListGroup.Item>
    );
};

export default App;
