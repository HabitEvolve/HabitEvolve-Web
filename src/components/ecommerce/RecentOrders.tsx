import { Check, Clock, X, SlidersHorizontal, type LucideIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import SkyCard from "../ui/card/SkyCard";
import SkyButton from "../ui/button/SkyButton";

// Define the TypeScript interface for the table rows
interface Product {
  id: number; // Unique identifier for each product
  name: string; // Product name
  variants: string; // Number of variants (e.g., "1 Variant", "2 Variants")
  category: string; // Category of the product
  price: string; // Price of the product (as a string with currency symbol)
  // status: string; // Status of the product
  image: string; // URL or path to the product image
  status: "Delivered" | "Pending" | "Canceled"; // Status of the product
}

// Define the table data using the interface
const tableData: Product[] = [
  {
    id: 1,
    name: "MacBook Pro 13”",
    variants: "2 Variants",
    category: "Laptop",
    price: "$2399.00",
    status: "Delivered",
    image: "/images/product/product-01.jpg", // Replace with actual image URL
  },
  {
    id: 2,
    name: "Apple Watch Ultra",
    variants: "1 Variant",
    category: "Watch",
    price: "$879.00",
    status: "Pending",
    image: "/images/product/product-02.jpg", // Replace with actual image URL
  },
  {
    id: 3,
    name: "iPhone 15 Pro Max",
    variants: "2 Variants",
    category: "SmartPhone",
    price: "$1869.00",
    status: "Delivered",
    image: "/images/product/product-03.jpg", // Replace with actual image URL
  },
  {
    id: 4,
    name: "iPad Pro 3rd Gen",
    variants: "2 Variants",
    category: "Electronics",
    price: "$1699.00",
    status: "Canceled",
    image: "/images/product/product-04.jpg", // Replace with actual image URL
  },
  {
    id: 5,
    name: "AirPods Pro 2nd Gen",
    variants: "1 Variant",
    category: "Accessories",
    price: "$240.00",
    status: "Delivered",
    image: "/images/product/product-05.jpg", // Replace with actual image URL
  },
];

// Every status carries a glyph as well as a tint, so the outcome is legible
// without colour (§4). Delivered is teal — never green.
const STATUS_META: Record<Product["status"], { cls: string; Icon: LucideIcon }> = {
  Delivered: { cls: "sky-badge-success", Icon: Check },
  Pending: { cls: "sky-badge-pending", Icon: Clock },
  Canceled: { cls: "sky-badge-danger", Icon: X },
};

const headCell = "py-3 text-start text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-ink-3";

export default function RecentOrders() {
  return (
    <SkyCard variant="admin" className="px-4 pb-3 pt-5 sm:px-6">
      <div className="relative flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3">
            Latest activity
          </p>
          <h3 className="mt-1 font-display text-sky-h3 font-semibold text-sky-ink leading-tight">
            Recent Orders
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <SkyButton type="button" variant="secondary" size="sm">
            <SlidersHorizontal className="w-4 h-4" strokeWidth={2.3} aria-hidden="true" />
            Filter
          </SkyButton>
          <SkyButton type="button" variant="ghost" size="sm">
            See all
          </SkyButton>
        </div>
      </div>
      <div className="relative max-w-full overflow-x-auto">
        <Table>
          {/* Table Header */}
          <TableHeader className="border-y border-sky-ink/8">
            <TableRow>
              <TableCell isHeader className={headCell}>Products</TableCell>
              <TableCell isHeader className={headCell}>Category</TableCell>
              <TableCell isHeader className={headCell}>Price</TableCell>
              <TableCell isHeader className={headCell}>Status</TableCell>
            </TableRow>
          </TableHeader>

          {/* Table Body */}

          <TableBody className="divide-y divide-sky-ink/7">
            {tableData.map((product) => {
              const { cls, Icon } = STATUS_META[product.status];
              return (
                <TableRow key={product.id} className="sky-table-row">
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      {/* Product shots get a hairline ring so a light photo
                          doesn't dissolve into the glass behind it. */}
                      <div className="h-13 w-13 shrink-0 overflow-hidden rounded-sky-chip ring-1 ring-white/85 bg-white/60">
                        <img
                          src={product.image}
                          className="h-full w-full object-cover"
                          alt={product.name}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-sky-ink truncate">
                          {product.name}
                        </p>
                        <span className="text-xs font-medium text-sky-ink-3">
                          {product.variants}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-sm font-medium text-sky-ink-2 tabular-nums">
                    {product.price}
                  </TableCell>
                  <TableCell className="py-3 text-sm font-medium text-sky-ink-2">
                    {product.category}
                  </TableCell>
                  <TableCell className="py-3">
                    <span className={`sky-badge ${cls}`}>
                      <Icon className="w-3 h-3 shrink-0" strokeWidth={2.6} aria-hidden="true" />
                      {product.status}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </SkyCard>
  );
}
