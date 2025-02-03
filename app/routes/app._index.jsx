import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Thumbnail,
  Pagination,
  IndexFilters,
  useSetIndexFiltersMode,
  Filters,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { ImageIcon } from "@shopify/polaris-icons";
import { useCallback, useEffect, useState } from "react";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const direction = url.searchParams.get("direction");
  const query = url.searchParams.get("q");
  const sortKey = url.searchParams.get("sortKey");

  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `
    query ($first: Int, $last: Int, $after: String, $before: String, $query: String, $sortKey: ProductSortKeys) {
      products(first: $first, last: $last, after: $after, before: $before, query: $query, sortKey: $sortKey) {
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
        pageInfo {
          endCursor
          hasNextPage
          hasPreviousPage
          startCursor
        }
      }
    }`,
    {
      variables: {
        first: direction === "next" || !direction ? 5 : null,
        last: direction === "previous" ? 5 : null,
        after: direction === "next" ? cursor : null,
        before: direction === "previous" ? cursor : null,
        query,
        sortKey
      },
    },
  );

  const {
    data: {
      products: { nodes, pageInfo },
    },
  } = await response.json();

  return { products: nodes, productsPageInfo: pageInfo };
};

export default function Index() {
  const [params, setParams] = useState({
    sortKey: "CREATED_AT",
  });
  const { products, productsPageInfo } = useLoaderData();
  const navigate = useNavigate();
  const { mode, setMode } = useSetIndexFiltersMode();

  useEffect(() => {
    const paramsUrl = new URLSearchParams(params);
    navigate(`/app?${paramsUrl.toString()}`);
  }, [navigate, params]);

  const [sortOptions] = useState([
    { label: "Created", value: "CREATED_AT" },
    { label: "ID", value: "ID" },
    { label: "Inventory Total", value: "INVENTORY_TOTAL" },
    { label: "Product Type", value: "PRODUCT_TYPE" },
    { label: "Published", value: "PUBLISHED_AT" },
    { label: "Relevance", value: "RELEVANCE" },
    { label: "Title", value: "TITLE" },
    { label: "Updated", value: "UPDATED_AT" },
    { label: "Vendor", value: "VENDOR" },
  ]);

  const resourceName = {
    singular: "product",
    plural: "products",
  };

  const handleFiltersQueryChange = useCallback((value) => {
    setParams({
      ...params,
      q: value,
    });
  }, [params]);

  const handleQueryValueRemove = useCallback(() => {
    setParams({
      ...params,
      q: undefined,
    });
  }, [params]);

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
        <IndexTable.Cell>{description || "-"}</IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  return (
    <Page fullWidth title="Product List">
      <Card padding={0}>
        <IndexFilters
          sortOptions={sortOptions}
          sortSelected={params.sortKey}
          onSort={(value) => setParams({ ...params, sortKey: value })}
          queryValue={params.q}
          queryPlaceholder="Search products"
          onQueryChange={handleFiltersQueryChange}
          onQueryClear={handleQueryValueRemove}
          tabs={[]}
          mode={mode}
          setMode={setMode}
          hideFilters
        />
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
        <Pagination
          type="table"
          onNext={() => setParams({ ...params, cursor: productsPageInfo.endCursor, direction: "next" })}
          onPrevious={() => setParams({ ...params, cursor: productsPageInfo.startCursor, direction: "previous" })}
          hasNext={productsPageInfo.hasNextPage}
          hasPrevious={productsPageInfo.hasPreviousPage}
          nextTooltip="Next page"
          previousTooltip="Previous page"
        />
      </Card>
      <br />
    </Page>
  );
}
