import { useLoaderData, useNavigate } from "@remix-run/react";
import { Page, Card, IndexTable, Thumbnail } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { ImageIcon } from "@shopify/polaris-icons";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(`
    {
      products(first: 25) {
        nodes {
          id
          title
          description
          images(first: 1) {
            nodes {
              url
            }
          }
        }
      }
    }`);

  const {
    data: {
      products: { nodes },
    },
  } = await response.json();

  return nodes;
};

export default function Index() {
  const products = useLoaderData();
  const navigate = useNavigate();

  const resourceName = {
    singular: "product",
    plural: "products",
  };

  const rowMarkup = products.map(
    ({ id, images, title, description }, index) => (
      <IndexTable.Row
        id={id}
        key={id}
        position={index}
        onClick={() => {
          navigate(`/app/product/${id.split("/").pop()}`);
        }}
      >
        <IndexTable.Cell>
          <Thumbnail
            source={images.nodes[0]?.url || ImageIcon}
            alt={"product thumbnail" + title}
          />
        </IndexTable.Cell>
        <IndexTable.Cell>{title}</IndexTable.Cell>
        <IndexTable.Cell>{description || '-'}</IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  return (
    <Page fullWidth title="Product List">
      <Card padding={0}>
          <IndexTable
            resourceName={resourceName}
            itemCount={products.length}
            selectable={false}
            headings={[
              { title: "" },
              { title: "Product" },
              { title: "Description" },
            ]}
          >
            {rowMarkup}
          </IndexTable>
      </Card>
    </Page>
  );
}
