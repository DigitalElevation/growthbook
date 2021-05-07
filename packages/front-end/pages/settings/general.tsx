import React, { useEffect, useState } from "react";
import useApi from "../../hooks/useApi";
import LoadingOverlay from "../../components/LoadingOverlay";
import { MemberRole, OrganizationSettings, useAuth } from "../../services/auth";
import { FaCheck, FaPencilAlt } from "react-icons/fa";
import EditOrganizationForm from "../../components/Settings/EditOrganizationForm";
import useForm from "../../hooks/useForm";
import { ImplementationType } from "back-end/types/experiment";

export type SettingsApiResponse = {
  status: number;
  organization?: {
    invites: {
      email: string;
      key: string;
      role: MemberRole;
      dateCreated: string;
    }[];
    ownerEmail: string;
    name: string;
    url: string;
    members: {
      id: string;
      email: string;
      name: string;
      role: MemberRole;
    }[];
    subscription?: {
      id: string;
      qty: number;
      trialEnd: Date;
      status:
        | "incomplete"
        | "incomplete_expired"
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "unpaid";
    };
    slackTeam?: string;
    settings?: OrganizationSettings;
  };
};

function hasTypeChanges(
  value: {
    visual: boolean;
    code: boolean;
    configuration: boolean;
    custom: boolean;
  },
  types: ImplementationType[]
) {
  const current = Object.keys(value).filter((k) => value[k]);
  if (current.length !== types.length) return true;

  const existing = [...types];
  existing.sort();
  current.sort();

  return JSON.stringify(existing) !== JSON.stringify(current);
}

function hasCustomizationChanges(
  value: {
    customized: boolean;
    logoPath: string;
    primaryColor: string;
    secondaryColor: string;
  },
  existing: OrganizationSettings
) {
  if (
    value.customized === existing.customized &&
    value.logoPath === existing.logoPath &&
    value.primaryColor === existing.primaryColor &&
    value.secondaryColor === existing.secondaryColor
  )
    return false;
  return true;
}

const GeneralSettingsPage = (): React.ReactElement => {
  const { data, error, mutate } = useApi<SettingsApiResponse>(`/organization`);
  const [editOpen, setEditOpen] = useState(false);

  // eslint-disable-next-line
  const [value, inputProps, manualUpdate] = useForm({
    types: {
      visual: false,
      code: false,
      configuration: false,
      custom: false,
    },
    // customization:
    customized: false,
    logoPath: "",
    primaryColor: "#391c6d",
    secondaryColor: "#50279a",
  });
  const { apiCall, organizations, setOrganizations, orgId } = useAuth();

  useEffect(() => {
    if (data?.organization?.settings) {
      const updated = { ...value };
      const freshValues = data.organization.settings;
      if (data?.organization?.settings?.implementationTypes) {
        const typeArr = data.organization.settings.implementationTypes;
        const types = {
          visual: typeArr.includes("visual"),
          code: typeArr.includes("code"),
          configuration: typeArr.includes("configuration"),
          custom: typeArr.includes("custom"),
        };
        updated.types = types;
      }
      updated.customized = freshValues.customized || false;
      updated.logoPath = freshValues.logoPath || "";
      updated.primaryColor = freshValues.primaryColor || "";
      updated.secondaryColor = freshValues.secondaryColor || "";
      manualUpdate(updated);
    }
  }, [data?.organization?.settings]);

  if (error) {
    return (
      <div className="alert alert-danger">
        An error occurred: {error.message}
      </div>
    );
  }
  if (!data) {
    return <LoadingOverlay />;
  }

  const typeChanges = hasTypeChanges(
    value.types,
    data?.organization?.settings?.implementationTypes || []
  );

  const customizationChanges = hasCustomizationChanges(
    value,
    data?.organization?.settings
  );

  const ctaEnabled = typeChanges || customizationChanges;

  const saveSettings = async () => {
    const types = (Object.keys(value.types) as ImplementationType[]).filter(
      (k) => value.types[k]
    );

    await apiCall(`/organization`, {
      method: "PUT",
      body: JSON.stringify({
        settings: {
          implementationTypes: types,
          customized: value.customized,
          logoPath: value.logoPath,
          primaryColor: value.primaryColor,
          secondaryColor: value.secondaryColor,
        },
      }),
    });
    await mutate();
    organizations.forEach((org) => {
      if (org.id === orgId) {
        org.settings = org.settings || {};
        org.settings.implementationTypes = types;
        org.settings.customized = value.customized;
        org.settings.logoPath = value.logoPath;
        org.settings.primaryColor = value.primaryColor;
        org.settings.secondaryColor = value.secondaryColor;
      }
    });
    setOrganizations(organizations);
  };

  return (
    <div className="container-fluid mt-3 pagecontents">
      {editOpen && (
        <EditOrganizationForm
          name={data.organization.name}
          close={() => setEditOpen(false)}
          mutate={mutate}
        />
      )}
      <h1>General Settings</h1>

      <div className=" mb-1">
        <div className=" bg-white p-3 border">
          <div className="row">
            <div className="col-sm-3">
              <h4>Organization</h4>
            </div>
            <div className="col-sm-9">
              <div className="form-group row">
                <div className="col-sm-12">
                  <strong>Name: </strong> {data.organization.name}{" "}
                  <a
                    href="#"
                    className="pl-1"
                    onClick={(e) => {
                      e.preventDefault();
                      setEditOpen(true);
                    }}
                  >
                    <FaPencilAlt />
                  </a>
                </div>
              </div>
              <div className="form-group row">
                <div className="col-sm-12">
                  <strong>Owner:</strong> {data.organization.ownerEmail}
                </div>
              </div>
              {data.organization.slackTeam && (
                <div className="form-group row">
                  <div
                    className="col-sm-12"
                    title={"Team: " + data.organization.slackTeam}
                  >
                    <FaCheck /> Connected to Slack
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="divider border-bottom mb-3 mt-2"></div>
          <div className="row">
            <div className="col-sm-3">
              <h4>Customization</h4>
            </div>
            <div className="col-sm-9">
              <div className="form-group row">
                <div className="col-auto ">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input "
                      checked={value.customized}
                      onChange={(e) => {
                        manualUpdate({
                          customized: e.target.checked,
                        });
                      }}
                      id="checkbox-customized"
                    />

                    <label
                      htmlFor="checkbox-customized"
                      className="form-check-label"
                    >
                      Enable customization
                    </label>
                  </div>
                </div>
                <div className="col-sm-9"></div>
              </div>
              {value.customized && (
                <>
                  <div className="form-group row">
                    <div className="col-sm-3 col-form-label">
                      <label htmlFor="customlogo">Custom logo</label>
                    </div>
                    <div className="col-sm-9">
                      <input
                        type="text"
                        className="form-control"
                        id="customlogo"
                        placeholder="/path/to/logo.png"
                        {...inputProps.logoPath}
                      />
                      <p>
                        <small className="text-muted">
                          Logo will be scaled to fit 225 x 46
                        </small>
                      </p>
                    </div>
                  </div>
                  <div className="form-group row">
                    <div className="col-sm-3 col-form-label">
                      <label htmlFor="formGroupExampleInput">
                        Primary Color
                      </label>
                    </div>
                    <div className="col-sm-9">
                      <input
                        className="form-control"
                        type="color"
                        id="primarycolor"
                        name="primarycolor"
                        {...inputProps.primaryColor}
                      />
                    </div>
                  </div>
                  <div className="form-group row">
                    <div className="col-sm-3 col-form-label">
                      <label htmlFor="formGroupExampleInput">
                        Secondary Color
                      </label>
                    </div>
                    <div className="col-sm-9">
                      <input
                        className="form-control"
                        type="color"
                        id="secondarycolor"
                        name="secondarycolor"
                        {...inputProps.secondaryColor}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="divider border-bottom mb-3 mt-3"></div>
          <div className="row">
            <div className="col-12">
              <div className=" d-flex flex-row-reverse">
                <button
                  className={`btn btn-${ctaEnabled ? "primary" : "secondary"}`}
                  type="submit"
                  disabled={!ctaEnabled}
                  onClick={async (e) => {
                    e.preventDefault();
                    if (!ctaEnabled) return;
                    saveSettings();
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettingsPage;
