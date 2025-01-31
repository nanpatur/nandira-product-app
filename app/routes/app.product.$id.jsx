import {
  Banner,
  BlockStack,
  Card,
  Divider,
  Form,
  FormLayout,
  Page,
  TextField,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import {
  redirect,
  useFetcher,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
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
    return redirect("/app");
  } catch (error) {
    return {
      status: 500,
      message: error?.body?.errors?.message,
    };
  }
};

export function ErrorBoundary() {
  const error = useRouteError();
  return <pre>{JSON.stringify(error, null, 2)}</pre>;
}

export default function ProductEditPage() {
  const [formValues, setFormValues] = useState({});
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

  const handleTitleChange = useCallback(
    (value) => setFormValues((prev) => ({ ...prev, title: value })),
    [],
  );

  const isFormValid = useMemo(() => {
    return formValues?.title?.length > 0 || formValues?.title === product?.title;
  }, [formValues, product]);

  const isLoading = fetcher.state === "submitting" || fetcher.state === "loading";

  return (
    <Page
      title="Edit Product"
      backAction={{ content: "Products", url: "/app" }}
      primaryAction={{
        content: "Save",
        onAction: handleSubmit,
        disabled: !isFormValid,
        loading: isLoading,
      }}
      narrowWidth
    >
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
                type="title"
                autoComplete="title"
                disabled={isLoading}
              />
            </FormLayout>
          </Form>
        </BlockStack>
      </Card>
    </Page>
  );
}
