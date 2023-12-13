// Xtract360_form_spec.js

describe("Xtract360 Form Automation", () => {
  let formData = null;
  let fieldConfig = null;

  before(() => {
    // Loading fixtures
    cy.fixture("fixture-data.json").then((data) => {
      formData = data;
    });
    cy.fixture("field-configuration.json").then((config) => {
      fieldConfig = config;
    });
  });

  beforeEach(() => {
    // Visit before each it block
    cy.visit(
      "https://xtract360-qa-challenge.s3.eu-west-1.amazonaws.com/index.html"
    );
  });

  it("fills out the form using fixture data", () => {
    fillFormFields("vehicle-details");

    cy.get("button").contains("Next").click();

    cy.wait(1000);

    fillFormFields("third-party-details");

    cy.get("button").contains("Done").click();

    // Check that information matches
    // Not checking for default value if data from fixture-data is undefined (future work)
    verifyInformation();
  });

  function verifyInformation() {
    // Verifying driver info
    Object.keys(formData.driver).forEach((key) => {
      const value = formData.driver[key].toString();
      cy.get(`[data-testid="driver.${key}"]`)
        .find("p")
        .should("have.text", value);
    });

    // Verifying vehicle info
    Object.keys(formData.vehicle).forEach((key) => {
      let value = formData.vehicle[key];
      if (key === "tradeValue") {
        // Formatting trade value eg 5700 GBP
        value = `${value.value} ${value.currency}`;
      } else {
        value = value.toString();
      }
      cy.get(`[data-testid="vehicle.${key}"]`)
        .find("p")
        .should("have.text", value);
    });

    // Verifying third parties info
    const thirdPartiesCount = formData.thirdParties.count;
    cy.get('[data-testid="thirdParties.count"]').find("p").should("have.text", thirdPartiesCount.toString());
  
    for (let i = 1; i <= thirdPartiesCount; i++) {
      Object.keys(formData.thirdParties[i]).forEach((key) => {
        const value = formData.thirdParties[i][key].toString();
        cy.get(`[data-testid="thirdParties.${i}.${key}"]`)
          .find("p")
          .should("have.text", value);
      });
    }
  }

  function extractValueForField(field, formData) {
    // Use path from field-config to retrieve corresponding data from fixture-data
    return Cypress._.get(formData, field.path);
  }

  function evaluateCondition(condition, formData) {
    // Extract the actual value from formData based on the condition's path
    const actualValue = Cypress._.get(formData, condition.path);

    // Map string operator into JS operator
    const operator = mapOperator(condition.operator);

    // Grab comparison value from json
    const comparisonValue = condition.value;

    // Function returns the result of condition
    return new Function(
      "actual",
      "comparison",
      `return actual ${operator} comparison;`
    )(actualValue, comparisonValue);
  }

  function fillFormFields(screenId) {
    const screenConfig = fieldConfig.find(
      (screen) => screen.screenId === screenId
    );

    screenConfig.fields.forEach((field) => {
      // Extract the value for the field
      const fieldData = extractValueForField(field, formData);

      // Evaluate condition if field has one
      if (field.condition && !evaluateCondition(field.condition, formData)) {
        return;
      }

      // Use default value if fieldData is undefined
      if (field.type === "textInput") {
        cy.get(`[data-testid="${field.testId}"]`)
          .type("{selectall}{backspace}")
          .type(fieldData || field.defaultValue);
      } else if (field.type === "enumInput") {
        cy.get(`[data-testid="${field.testId}"]`).click();
        cy.get(`[data-value="${fieldData || field.defaultValue}"]`).click();
      } else if (field.type === "integerInput") {
        cy.get(`[data-testid="${field.testId}"]`).type(
          fieldData || field.defaultValue
        );
      } else if (field.type === "currencyInput") {
        cy.get(`[data-testid="ArrowDropDownIcon"]`).eq(1).parent().click();
        cy.get(`[data-value="${fieldData.currency}"]`).click();
        cy.get(`[data-testid="${field.testId}"]`)
          .type("{selectall}{backspace}")
          .type(fieldData.value);
      }
    });
  }

  function mapOperator(textualOperator) {
    // Translate operators from json
    switch (textualOperator) {
      case "less":
        return "<";
      case "greater":
        return ">";
      case "equal":
        return "==";
      case "lessOrEqual":
        return "<=";
      case "greaterOrEqual":
        return ">=";
      default:
        return false;
    }
  }
});
