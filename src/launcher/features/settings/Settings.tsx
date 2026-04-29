/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';

import WithScrollbarContainer from '../../util/WithScrollbarContainer';
import AddSourceDialog from '../sources/AddSourceDialog';
import ConfirmRemoveSourceDialog from '../sources/ConfirmRemoveSourceDialog';
import AddArtifactoryTokenDialog from './AddArtifactoryTokenDialog';
import AppSources from './Cards/AppSources';
import Authentication from './Cards/Authentication';
import ChineseAppServer from './Cards/ChineseAppServer';
import Updates from './Cards/Updates';
import UsageStatistics from './Cards/UsageStatistics';
import RemoveArtifactoryTokenDialog from './RemoveArtifactoryTokenDialog';
import UpdateCheckCompleteDialog from './UpdateCheckCompleteDialog';

export default () => (
    <WithScrollbarContainer>
        <div className="settings-pane-container tw-flex tw-flex-col tw-gap-4">
            <Updates />
            <AppSources />
            <Authentication />
            <ChineseAppServer />
            <UsageStatistics />

            <UpdateCheckCompleteDialog />
            <AddSourceDialog />
            <ConfirmRemoveSourceDialog />
            <AddArtifactoryTokenDialog />
            <RemoveArtifactoryTokenDialog />
        </div>
    </WithScrollbarContainer>
);
