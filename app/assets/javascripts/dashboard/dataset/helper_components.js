// @flow
import * as React from "react";
import { Tabs, Icon, Alert, Form, Tooltip, Modal } from "antd";
const { TabPane } = Tabs;

const FormItem = Form.Item;

export const jsonEditStyle = {
  fontFamily: 'Monaco, Consolas, "Courier New", monospace',
};

export function Hideable({ children, hidden }: { children: React.Node, hidden: boolean }) {
  return <div style={{ display: hidden ? "none" : "block" }}>{children}</div>;
}

export const FormItemWithInfo = ({
  label,
  info,
  children,
  ...props
}: {
  label: React.Node,
  info: React.Node,
  children: React.Node,
}) => (
  <FormItem
    {...props}
    colon={false}
    label={
      <span>
        {label}{" "}
        <Tooltip title={info}>
          <Icon type="info-circle-o" style={{ color: "gray" }} />
        </Tooltip>
      </span>
    }
  >
    {children}
  </FormItem>
);

export class RetryingErrorBoundary extends React.Component<
  { children: React.Node },
  { error: ?Error },
> {
  constructor() {
    super();
    this.state = { error: null };
  }

  componentWillReceiveProps() {
    this.setState({ error: null });
  }

  componentDidCatch(error: Error) {
    this.setState({ error });
  }

  render() {
    if (this.state.error) {
      return (
        <Alert
          type="error"
          showIcon
          message={
            <span>
              An error occurred while processing the configuration. Ensure that the JSON is valid.
              {this.state.error.toString()}
            </span>
          }
        />
      );
    }
    return this.props.children;
  }
}

export const confirmAsync = (opts: Object) =>
  new Promise(resolve => {
    Modal.confirm({
      ...opts,
      onOk() {
        resolve(true);
      },
      onCancel() {
        resolve(false);
      },
    });
  });

export const createTabPaneWithDisplayNone = (activeTabKey: string) => ({
  tabKey,
  children,
  ...props
}) => {
  return (
    <TabPane key={tabKey} {...props}>
      <Hideable hidden={tabKey !== activeTabKey}>{children}</Hideable>
    </TabPane>
  );
};
