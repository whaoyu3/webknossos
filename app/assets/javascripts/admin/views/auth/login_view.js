// @flow
import React from "react";
import { Form, Icon, Input, Button, Col, Row } from "antd";
import { withRouter, Link } from "react-router-dom";
import Request from "libs/request";
import messages from "messages";
import Store from "oxalis/throttled_store";
import { setActiveUserAction } from "oxalis/model/actions/user_actions";
import { getActiveUser } from "admin/admin_rest_api";
import type { ReactRouterHistoryType } from "react_router";

const FormItem = Form.Item;

type Props = {
  form: Object,
  layout: "horizontal" | "inline",
  history: ReactRouterHistoryType,
};

class LoginView extends React.PureComponent<Props> {
  handleSubmit = (event: SyntheticInputEvent<>) => {
    event.preventDefault();

    this.props.form.validateFields(async (err: ?Object, formValues: Object) => {
      if (!err) {
        await Request.sendJSONReceiveJSON("/api/login", { data: formValues });
        const user = await getActiveUser();
        Store.dispatch(setActiveUserAction(user));
        this.props.history.push("/dashboard");
      }
    });
  };

  render() {
    const { getFieldDecorator } = this.props.form;
    const rowStyle = this.props.layout === "horizontal" ? { padding: 50 } : null;
    const resetStyle = this.props.layout === "horizontal" ? { float: "right" } : null;
    const linkStyle = this.props.layout === "inline" ? { paddingLeft: 10 } : null;

    return (
      <Row type="flex" justify="center" style={rowStyle} align="middle">
        <Col span={8}>
          <Form onSubmit={this.handleSubmit} layout={this.props.layout}>
            <FormItem>
              {getFieldDecorator("email", {
                rules: [
                  {
                    required: true,
                    type: "email",
                    message: messages["auth.registration_email_input"],
                  },
                ],
              })(
                <Input
                  prefix={<Icon type="mail" style={{ fontSize: 13 }} />}
                  placeholder="Email"
                />,
              )}
            </FormItem>
            <FormItem>
              {getFieldDecorator("password", {
                rules: [{ required: true, message: messages["auth.registration_password_input"] }],
              })(
                <Input
                  prefix={<Icon type="lock" style={{ fontSize: 13 }} />}
                  type="password"
                  placeholder="Password"
                />,
              )}
            </FormItem>
            <FormItem>
              <Button type="primary" htmlType="submit" style={{ width: "100%" }}>
                Log in
              </Button>
              <Link to="/register" style={linkStyle}>
                Register Now!
              </Link>
              <Link to="/reset" style={Object.assign({}, linkStyle, resetStyle)}>
                Forgot Password
              </Link>
            </FormItem>
          </Form>
        </Col>
      </Row>
    );
  }
}

export default withRouter(Form.create()(LoginView));
