import {
  CloseOutlined,
  CloudUploadOutlined,
  MailOutlined,
  PlayCircleOutlined,
  PlusCircleOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import * as React from "react";
import { Link } from "react-router-dom";
import { isUserAdminOrTeamManager, isUserAdminOrDatasetManager } from "libs/utils";
import type { APIUser } from "types/api_flow_types";
import { getDemoDatasetUrl } from "features";
import renderIndependently from "libs/render_independently";
import { InviteUsersModal } from "admin/onboarding";
type WhatsNextActionProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick?: (...args: Array<any>) => any;
  href?: string;
  to?: string;
};

const WhatsNextAction = ({ title, description, icon, onClick, href, to }: WhatsNextActionProps) => {
  const content = (
    <React.Fragment>
      {icon}
      <div className="label">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <RightOutlined className="chevron" />
    </React.Fragment>
  );

  if (to != null) {
    return <Link to={to}>{content}</Link>;
  }

  const linkProps =
    href != null
      ? {
          href,
          target: "_blank",
        }
      : {
          href: "#",
          onClick,
        };
  return <a {...linkProps}>{content}</a>;
};

type WhatsNextHeaderProps = {
  activeUser: APIUser;
  onDismiss: () => void;
};
export const WhatsNextHeader = ({ activeUser, onDismiss }: WhatsNextHeaderProps) => (
  <div>
    <div
      className="welcome-header-wrapper"
      style={{
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          margin: 8,
        }}
      >
        <Tooltip title="Don't show this again" placement="left">
          <Button type="text" onClick={onDismiss}>
            Close
            <CloseOutlined />
          </Button>
        </Tooltip>
      </div>
      <div className="welcome-header-content">
        <div className="text-and-button-container">
          <h1>Welcome to WEBKNOSSOS!</h1>
          <div className="subtitle">
            <p
              style={{
                fontSize: 20,
                lineHeight: 1.5,
                marginTop: 0,
                marginBottom: 8,
              }}
            >
              Congratulations on your new WEBKNOSSOS account! To hit the ground running, we
              recommend the following steps to you:
            </p>
            <div className="whats-next-actions-grid">
              <WhatsNextAction
                title="Open a Demo Dataset"
                description="Have a look at a public dataset to experience WEBKNOSSOS in action."
                href={getDemoDatasetUrl()}
                icon={<PlayCircleOutlined className="action-icon" />}
              />

              {isUserAdminOrDatasetManager(activeUser) ? (
                <WhatsNextAction
                  title="Import Your Own Data"
                  description="Directly upload your data as a zip file."
                  to="/datasets/upload"
                  icon={<CloudUploadOutlined className="action-icon" />}
                />
              ) : null}

              <WhatsNextAction
                title="Learn How To Create Annotations"
                description="Watch a short video to see how data can be annotated with WEBKNOSSOS."
                icon={<PlusCircleOutlined className="action-icon" />}
                href="https://www.youtube.com/watch?v=jsz0tc3tuKI&t=30s"
              />
              {isUserAdminOrTeamManager(activeUser) ? (
                <WhatsNextAction
                  title="Invite Your Colleagues"
                  description="Send email invites to your colleagues and ask them to join your organization."
                  icon={<MailOutlined className="action-icon" />}
                  onClick={() => {
                    renderIndependently((destroy) => (
                      <InviteUsersModal
                        organizationName={activeUser.organization}
                        destroy={destroy}
                      />
                    ));
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
export default {};
