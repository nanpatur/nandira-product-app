import {
  Banner,
  BlockStack,
  Card,
  ContextualSaveBar,
  Divider,
  Form,
  FormLayout,
  Frame,
  Page,
  TextField,
  Toast,
} from "@shopify/polaris";
import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useRouteError,
} from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { useCallback, useEffect, useMemo, useState } from "react";

export const loader = async ({ params, request }) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(`
    {
      product(id: "gid://shopify/Product/${params.id}") {
        id
        title
        description
        images(first: 1) {
          nodes {
            url
          }
        }
        status
      }
    }
  `);

  const {
    data: { product },
  } = await response.json();

  return product;
};

export const action = async ({ request }) => {
  try {
    const formData = await request.formData();
    const inputData = Object.fromEntries(formData.entries());
    const { admin } = await authenticate.admin(request);
    await admin.graphql(
      `
      mutation {
        productUpdate(input: {
          id: "${inputData.id}",
          title: "${inputData.title}",
        }) {
          product {
            id
            title
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
      {
        variables: {
          input: inputData,
        },
      },
    );
    return { status: 200, message: "Product updated successfully" };
  } catch (error) {
    return {
      status: 500,
      message: error?.body?.errors?.message || "An error occurred",
    };
  }
};

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <Banner title="An error occurred" status="critical">
      <p>{error?.message || "Something went wrong. Please try again later."}</p>
    </Banner>
  );
}

export default function ProductEditPage() {
  const [formValues, setFormValues] = useState({});
  const [toastMessage, setToastMessage] = useState("");
  const navigate = useNavigate();

  const toastMarkup = toastMessage ? (
    <Toast content={toastMessage} onDismiss={() => setToastMessage("")} />
  ) : null;

  const fetcher = useFetcher();
  const product = useLoaderData();

  useEffect(() => {
    setFormValues({
      id: product?.id,
      title: product?.title,
    });
  }, [product]);

  const handleSubmit = useCallback(() => {
    const body = new FormData();
    Object.entries(formValues).forEach(([key, value]) => {
      body.append(key, value);
    });
    fetcher.submit(body, { method: "post" });
  }, [fetcher, formValues]);

  useEffect(() => {
    if (fetcher.data?.status === 200) {
      setToastMessage(fetcher.data.message);
      navigate("/app");
    }
  }, [fetcher.data, navigate]);

  const handleTitleChange = useCallback(
    (value) => setFormValues((prev) => ({ ...prev, title: value })),
    [],
  );

  const isFormValid = useMemo(() => {
    return (
      formValues?.title?.length > 0 && formValues?.title !== product?.title
    );
  }, [formValues, product]);

  const isLoading = useMemo(() => fetcher.state === "submitting" || fetcher.state === "loading", [fetcher.state]);

  return (
    <Frame>
      <Page
        title="Edit Product"
        backAction={{ content: "Products", url: "/app" }}
        narrowWidth
      >
        {isFormValid && (
          <ContextualSaveBar
            alignContentFlush
            message="Unsaved changes"
            saveAction={{
              loading: isLoading,
              onAction: handleSubmit,
            }}
            discardAction={{
              disabled: isLoading,
              content: "Reset Changes",
              onAction: () => setFormValues({ ...product }),
            }}
          />
        )}
        <Card>
          <BlockStack gap="500">
            {fetcher?.data?.status === 500 && (
              <>
                <Banner title="Product Edit Error" tone="critical">
                  <p>{fetcher?.data?.message}</p>
                </Banner>
                <Divider />
              </>
            )}
            <Form onSubmit={handleSubmit}>
              <FormLayout>
                <TextField
                  value={formValues?.title}
                  onChange={handleTitleChange}
                  label="Title"
                  type="text"
                  autoComplete="title"
                  disabled={isLoading}
                />
              </FormLayout>
            </Form>
          </BlockStack>
        </Card>
        {toastMarkup}
      </Page>
    </Frame>
  );
}
