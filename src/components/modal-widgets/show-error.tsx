import * as React from "react";

import { ModalWidgetDiv } from "./modal-widget";

import styled from "../styles";
import Log from "../basics/log";
import { IModalWidgetProps } from "./index";
import { size } from "underscore";
import { getErrorStack, isInternalError } from "../../buse";

const StyledLog = styled(Log)`
  tbody {
    min-height: 250px;
  }

  padding-bottom: 1em;
`;

const Pre = styled.pre`
  max-height: 10em;
  overflow-y: scroll;
  background: ${props => props.theme.sidebarBackground};
  padding: 1em;
  line-height: 1.4;
  margin-bottom: 1em;
  white-space: pre-wrap;
`;

const ContainerDiv = styled.div`
  details {
    padding-left: 1em;

    summary {
      margin-left: -1em;
      margin-bottom: 1em;
      padding: 0.2m;

      &:active,
      &:focus {
        outline: 0;
      }

      &:hover {
        cursor: pointer;
      }
    }
  }
`;

class ShowError extends React.PureComponent<IProps> {
  render() {
    const { rawError, log } = this.props.modal.widgetParams;
    const internal = isInternalError(rawError);
    if (!internal) {
      return null;
    }

    const errorStack = getErrorStack(rawError);
    const errorLines = (errorStack || "Unknown error").split("\n");
    return (
      <ModalWidgetDiv>
        <ContainerDiv>
          <details>
            <summary>View details</summary>
            {size(errorLines) == 1 ? null : (
              <details>
                <summary>{errorLines[0]}</summary>
                <Pre>{errorLines.slice(1).join("\n")}</Pre>
              </details>
            )}
            <details open>
              <summary>Debug log</summary>
              <StyledLog log={log} />
            </details>
          </details>
        </ContainerDiv>
        <label>
          <input type="checkbox" checked />
          Send a report to help resolve this issue
        </label>
      </ModalWidgetDiv>
    );
  }
}

export interface IShowErrorParams {
  rawError: any;
  log: string;
}

interface IProps extends IModalWidgetProps<IShowErrorParams, void> {}

export default ShowError;
