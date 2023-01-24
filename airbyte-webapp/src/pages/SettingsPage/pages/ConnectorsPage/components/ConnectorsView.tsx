import { CellContext, ColumnSort, createColumnHelper } from "@tanstack/react-table";
import { useCallback } from "react";
import { FormattedMessage } from "react-intl";

import { HeadTitle } from "components/common/HeadTitle";
import { FlexContainer } from "components/ui/Flex";
import { Heading } from "components/ui/Heading";
import { NextTable } from "components/ui/NextTable";

import { Connector, ConnectorDefinition } from "core/domain/connector";
import { DestinationDefinitionRead, SourceDefinitionRead } from "core/request/AirbyteClient";
import { useAvailableConnectorDefinitions } from "hooks/domain/connector/useAvailableConnectorDefinitions";
import { FeatureItem, useFeature } from "hooks/services/Feature";
import { useCurrentWorkspace } from "hooks/services/useWorkspace";

import ConnectorCell from "./ConnectorCell";
import styles from "./ConnectorsView.module.scss";
import CreateConnector from "./CreateConnector";
import ImageCell from "./ImageCell";
import { FormContentTitle } from "./PageComponents";
import UpgradeAllButton from "./UpgradeAllButton";
import VersionCell from "./VersionCell";

interface ConnectorsViewProps {
  type: "sources" | "destinations";
  isUpdateSuccess: boolean;
  hasNewConnectorVersion?: boolean;
  usedConnectorsDefinitions: SourceDefinitionRead[] | DestinationDefinitionRead[];
  connectorsDefinitions: SourceDefinitionRead[] | DestinationDefinitionRead[];
  loading: boolean;
  error?: Error;
  onUpdate: () => void;
  onUpdateVersion: ({ id, version }: { id: string; version: string }) => void;
  feedbackList: Record<string, string>;
}

const defaultSorting: ColumnSort[] = [{ id: "name", desc: false }];

const ConnectorsView: React.FC<ConnectorsViewProps> = ({
  type,
  onUpdateVersion,
  feedbackList,
  isUpdateSuccess,
  hasNewConnectorVersion,
  usedConnectorsDefinitions,
  loading,
  error,
  onUpdate,
  connectorsDefinitions,
}) => {
  const allowUpdateConnectors = useFeature(FeatureItem.AllowUpdateConnectors);
  const allowUploadCustomImage = useFeature(FeatureItem.AllowUploadCustomImage);
  const workspace = useCurrentWorkspace();
  const availableConnectorDefinitions = useAvailableConnectorDefinitions<ConnectorDefinition>(
    connectorsDefinitions,
    workspace
  );
  const showVersionUpdateColumn = useCallback(
    (definitions: ConnectorDefinition[]) => {
      if (allowUpdateConnectors) {
        return true;
      }
      if (allowUploadCustomImage && definitions.some((definition) => definition.releaseStage === "custom")) {
        return true;
      }
      return false;
    },
    [allowUpdateConnectors, allowUploadCustomImage]
  );

  const columnHelper = createColumnHelper<ConnectorDefinition>();

  const renderColumns = useCallback(
    (showVersionUpdateColumn: boolean) => [
      columnHelper.accessor("name", {
        header: () => <FormattedMessage id="admin.connectors" />,
        meta: {
          thClassName: styles.thName,
        },
        cell: (props: CellContext<ConnectorDefinition, string>) => (
          <ConnectorCell
            connectorName={props.cell.getValue()}
            img={props.row.original.icon}
            hasUpdate={allowUpdateConnectors && Connector.hasNewerVersion(props.row.original)}
            releaseStage={props.row.original.releaseStage}
          />
        ),
      }),
      columnHelper.accessor("dockerRepository", {
        header: () => <FormattedMessage id="admin.image" />,
        meta: {
          thClassName: styles.thDockerRepository,
        },
        cell: (props: CellContext<ConnectorDefinition, string>) => (
          <ImageCell imageName={props.cell.getValue()} link={props.row.original.documentationUrl} />
        ),
      }),
      columnHelper.accessor("dockerImageTag", {
        header: () => <FormattedMessage id="admin.currentVersion" />,
        meta: {
          thClassName: styles.thDockerImageTag,
        },
      }),
      ...(showVersionUpdateColumn
        ? [
            columnHelper.accessor("latestDockerImageTag", {
              header: () => (
                <FormContentTitle>
                  <FormattedMessage id="admin.changeTo" />
                </FormContentTitle>
              ),
              cell: (props: CellContext<ConnectorDefinition, string>) =>
                allowUpdateConnectors || (allowUploadCustomImage && props.row.original.releaseStage === "custom") ? (
                  <VersionCell
                    version={props.cell.getValue() || props.row.original.dockerImageTag}
                    id={Connector.id(props.row.original)}
                    onChange={onUpdateVersion}
                    feedback={feedbackList[Connector.id(props.row.original)]}
                    currentVersion={props.row.original.dockerImageTag}
                    updating={loading}
                  />
                ) : null,
            }),
          ]
        : []),
    ],
    [columnHelper, allowUpdateConnectors, allowUploadCustomImage, onUpdateVersion, feedbackList, loading]
  );

  const renderHeaderControls = (section: "used" | "available") =>
    ((section === "used" && usedConnectorsDefinitions.length > 0) ||
      (section === "available" && usedConnectorsDefinitions.length === 0)) && (
      <FlexContainer>
        {allowUploadCustomImage && <CreateConnector type={type} />}
        {(hasNewConnectorVersion || isUpdateSuccess) && allowUpdateConnectors && (
          <UpgradeAllButton
            isLoading={loading}
            hasError={!!error && !loading}
            hasSuccess={isUpdateSuccess}
            onUpdate={onUpdate}
          />
        )}
      </FlexContainer>
    );

  return (
    <>
      <HeadTitle
        titles={[{ id: "sidebar.settings" }, { id: type === "sources" ? "admin.sources" : "admin.destinations" }]}
      />
      <FlexContainer direction="column" gap="2xl">
        {usedConnectorsDefinitions.length > 0 && (
          <FlexContainer direction="column" gap="xl">
            <FlexContainer alignItems="center" justifyContent="space-between">
              <Heading as="h2" size="sm">
                <FormattedMessage id={type === "sources" ? "admin.manageSource" : "admin.manageDestination"} />
              </Heading>
              {renderHeaderControls("used")}
            </FlexContainer>
            <NextTable
              columns={renderColumns(showVersionUpdateColumn(usedConnectorsDefinitions))}
              data={usedConnectorsDefinitions}
              columnSort={defaultSorting}
            />
          </FlexContainer>
        )}

        <FlexContainer direction="column" gap="xl">
          <FlexContainer alignItems="center" justifyContent="space-between">
            <Heading as="h2" size="sm">
              <FormattedMessage id={type === "sources" ? "admin.availableSource" : "admin.availableDestinations"} />
            </Heading>
            {renderHeaderControls("available")}
          </FlexContainer>
          <NextTable
            columns={renderColumns(showVersionUpdateColumn(availableConnectorDefinitions))}
            data={availableConnectorDefinitions}
            columnSort={defaultSorting}
          />
        </FlexContainer>
      </FlexContainer>
    </>
  );
};

export default ConnectorsView;
