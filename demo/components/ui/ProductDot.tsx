const productColors: Record<string, string> = {
  N2: "var(--color-product-n2)",
  O2: "var(--color-product-o2)",
  CO2: "var(--color-product-co2)",
  AR: "var(--color-product-ar)",
  LPG: "var(--color-product-lpg)",
  "O2-M": "var(--color-product-med)",
};

export default function ProductDot({ product, size = 8 }: { product: string; size?: number }) {
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: productColors[product] || "var(--color-text-muted)",
      }}
    />
  );
}

export { productColors };
