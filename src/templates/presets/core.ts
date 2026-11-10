import { bar, box, qr, rule, seq, table, text, tpl, v, INK, MUTED } from "../builders";

/** 物流面单 — 100 × 150 */
export const waybill = tpl({
  id: "tpl_waybill_100x150",
  name: "快递面单",
  desc: "收寄件信息 + 运单条码，三通一达通用版式",
  category: "logistics",
  w: 100,
  h: 150,
  vars: [
    v("carrier", "快递公司", "顺丰速运"),
    v("service", "服务类型", "标准快递"),
    v("receiver", "收件人", "张伟"),
    v("receiverPhone", "收件电话", "138 0013 8000"),
    v("receiverAddr", "收件地址", "上海市浦东新区张江路 88 号 3 号楼 1201 室"),
    v("orderNo", "运单号", "SF1234567890123"),
    v("sender", "寄件人", "李娜"),
    v("senderPhone", "寄件电话", "139 2233 4455"),
    v("senderAddr", "寄件地址", "杭州市西湖区文三路 199 号"),
    v("weight", "重量", "2.4 kg"),
    v("date", "打印日期", "2026-11-10"),
    v("pieces", "件数", "1 件"),
    v("pay", "付款方式", "寄付"),
    v("eta", "时效", "次日达"),
  ],
  elements: [
    box(0, 0, 100, 16, { fill: "#111111", stroke: "transparent", strokeWidth: 0 }),
    text(4, 3, 44, 5, "{{carrier}}", { fontSize: 12, fontWeight: 700, color: "#ffffff" }),
    text(4, 9, 44, 4, "{{service}}", { fontSize: 7, color: "#d6d6d6" }),
    text(52, 4, 44, 8, "{{orderNo}}", {
      fontSize: 9,
      align: "right",
      color: "#ffffff",
      fontFamily: "Consolas",
    }),

    text(4, 19, 30, 3.5, "收件人", { fontSize: 6.5, color: MUTED, letterSpacing: 1 }),
    text(4, 22.5, 44, 8, "{{receiver}}", { fontSize: 17, fontWeight: 700 }),
    text(50, 24, 46, 6, "{{receiverPhone}}", {
      fontSize: 12,
      fontWeight: 600,
      align: "right",
      fontFamily: "Consolas",
    }),
    text(4, 31, 92, 12, "{{receiverAddr}}", {
      fontSize: 10.5,
      fontWeight: 600,
      lineHeight: 1.45,
      valign: "top",
    }),

    rule(4, 45, 92, { strokeWidth: 0.5 }),
    bar(6, 48, 88, 17, "{{orderNo}}", { textSize: 3.4, showText: false }),
    text(4, 67, 92, 4, "{{orderNo}}", {
      fontSize: 8,
      align: "center",
      fontFamily: "Consolas",
      letterSpacing: 1.5,
    }),

    rule(4, 74, 92, { strokeWidth: 0.25 }),
    text(4, 77, 14, 3.5, "寄件人", { fontSize: 6.5, color: MUTED }),
    text(18, 76.5, 30, 4.5, "{{sender}}", { fontSize: 8 }),
    text(50, 77, 20, 3.5, "{{senderPhone}}", { fontSize: 7.5, align: "right" }),
    text(4, 82, 92, 8, "{{senderAddr}}", { fontSize: 7.5, color: MUTED, lineHeight: 1.4, valign: "top" }),

    rule(4, 92, 92, { strokeWidth: 0.3 }),
    text(4, 94.5, 22, 3.2, "重量", { fontSize: 6.2, color: MUTED }),
    text(4, 97.6, 22, 5, "{{weight}}", { fontSize: 8.5 }),
    text(27, 94.5, 20, 3.2, "件数", { fontSize: 6.2, color: MUTED }),
    text(27, 97.6, 20, 5, "{{pieces}}", { fontSize: 8.5 }),
    text(48, 94.5, 20, 3.2, "付款", { fontSize: 6.2, color: MUTED }),
    text(48, 97.6, 20, 5, "{{pay}}", { fontSize: 8.5 }),
    text(70, 94.5, 26, 3.2, "时效", { fontSize: 6.2, color: MUTED }),
    text(70, 97.6, 26, 5, "{{eta}}", { fontSize: 8.5 }),
    rule(4, 104, 92, { strokeWidth: 0.25 }),

    qr(72, 116, 24, "{{orderNo}}"),
    text(4, 118, 62, 4, "扫码查询物流", { fontSize: 7, color: MUTED }),
    text(4, 123, 62, 5, "{{orderNo}}", { fontSize: 7.5, fontFamily: "Consolas" }),
    text(4, 130, 62, 4, "打印时间 {{date}}", { fontSize: 6.5, color: MUTED }),
    text(4, 140, 92, 4, "本面单由锋芒标签打印生成 · 仅用于演示", {
      fontSize: 5.5,
      color: "#9aa0a8",
      align: "center",
    }),
  ],
});

/** 库位标签 — 60 × 40 */
export const binLabel = tpl({
  id: "tpl_bin_60x40",
  name: "仓储库位",
  desc: "库位号大字 + 二维码，货架一眼识别",
  category: "warehouse",
  w: 60,
  h: 40,
  vars: [
    v("bin", "库位号", "A-01-03-2"),
    v("zone", "区域", "A 区 · 常温"),
    v("sku", "物料编码", "SKU-20241108"),
    v("qty", "数量", "120"),
    v("code", "二维码内容", "BIN:A-01-03-2"),
  ],
  elements: [
    box(0, 0, 60, 9, { fill: "#111111", stroke: "transparent", strokeWidth: 0 }),
    text(2.5, 1.6, 40, 5.5, "{{zone}}", { fontSize: 7.5, color: "#ffffff", fontWeight: 500 }),
    text(42, 1.6, 15.5, 5.5, "库位", {
      fontSize: 6,
      color: "#ffffff",
      align: "right",
      letterSpacing: 1,
    }),
    text(2, 11, 40, 12, "{{bin}}", {
      fontSize: 21,
      fontWeight: 700,
      fontFamily: "Consolas",
      letterSpacing: 0.4,
    }),
    text(2, 23.5, 40, 4, "{{sku}}", { fontSize: 7, color: MUTED, fontFamily: "Consolas" }),
    qr(42, 10.5, 16, "{{code}}"),
    rule(2, 28, 56, { strokeWidth: 0.25 }),
    text(2, 30, 24, 4, "数量", { fontSize: 6.5, color: MUTED }),
    text(2, 34, 24, 5, "{{qty}}", { fontSize: 11, fontWeight: 600, fontFamily: "Consolas" }),
    bar(30, 29.5, 28, 9, "{{sku}}", { showText: false }),
  ],
});

/** 商品价签 — 40 × 30 */
export const priceTag = tpl({
  id: "tpl_price_40x30",
  name: "商品价签",
  desc: "品名、价格、条码三件套，零售货架常用",
  category: "retail",
  w: 40,
  h: 30,
  vars: [
    v("name", "品名", "有机纯牛奶 250ml"),
    v("spec", "规格", "250ml × 12"),
    v("price", "售价", "59.90"),
    v("origin", "产地", "内蒙古"),
    v("code", "条码", "6901234567892"),
  ],
  elements: [
    text(2, 1.5, 30, 5, "{{name}}", { fontSize: 8, fontWeight: 600, valign: "top" }),
    text(2, 6.5, 30, 3.5, "{{spec}} · {{origin}}", { fontSize: 5.8, color: MUTED }),
    text(2, 10, 8, 5, "¥", { fontSize: 11, fontWeight: 700, color: "#c62828" }),
    text(7, 8.5, 31, 10, "{{price}}", {
      fontSize: 24,
      fontWeight: 700,
      color: "#c62828",
      align: "right",
      fontFamily: "Consolas",
    }),
    rule(2, 20.2, 36, { strokeWidth: 0.3 }),
    bar(4, 20.8, 32, 6.6, "{{code}}", { showText: false, format: "ean13" }),
    text(2, 27.8, 36, 2, "{{code}}", {
      fontSize: 4.2,
      align: "center",
      fontFamily: "Consolas",
      letterSpacing: 0.6,
    }),
  ],
});

/** 资产标签 — 50 × 20 */
export const assetTag = tpl({
  id: "tpl_asset_50x20",
  name: "资产标签",
  desc: "编号 + 二维码，适合贴设备与办公资产",
  category: "office",
  w: 50,
  h: 20,
  vars: [
    v("org", "单位", "未来科技"),
    v("assetNo", "资产编号", "ZC-2024-00871"),
    v("model", "设备型号", "ThinkPad T14"),
    v("owner", "责任人", "王小明"),
    v("code", "二维码内容", "ASSET:ZC-2024-00871"),
  ],
  elements: [
    qr(2, 1.5, 17, "{{code}}"),
    text(21, 2, 27, 3.5, "{{org}} · 固定资产", { fontSize: 5.6, color: MUTED, letterSpacing: 0.4 }),
    text(21, 5, 27, 6, "{{assetNo}}", { fontSize: 10.5, fontWeight: 700, fontFamily: "Consolas" }),
    rule(21, 11.5, 27, { strokeWidth: 0.25 }),
    text(21, 12.5, 27, 3.2, "{{model}}", { fontSize: 6 }),
    text(21, 15.5, 27, 3.2, "责任人 {{owner}}", { fontSize: 6, color: MUTED }),
  ],
});

/** 食品标签 — 50 × 30 */
export const foodLabel = tpl({
  id: "tpl_food_50x30",
  name: "食品标签",
  desc: "品名、配料、日期与保质期，符合门店自查要求",
  category: "food",
  w: 50,
  h: 30,
  vars: [
    v("name", "品名", "手工黑芝麻丸"),
    v("ingredients", "配料", "黑芝麻、蜂蜜、核桃仁"),
    v("produced", "生产日期", "2026-11-08"),
    v("shelf", "保质期", "90 天"),
    v("weight", "净含量", "200g"),
    v("code", "条码", "6971234560018"),
  ],
  elements: [
    text(2, 1.5, 32, 5, "{{name}}", { fontSize: 9, fontWeight: 700 }),
    text(34, 2, 14, 4, "{{weight}}", { fontSize: 7, align: "right", color: MUTED }),
    rule(2, 7, 46, { strokeWidth: 0.25 }),
    text(2, 8.5, 46, 8, "配料：{{ingredients}}", {
      fontSize: 6,
      lineHeight: 1.4,
      valign: "top",
      color: "#333333",
    }),
    text(2, 16, 24, 3.4, "生产日期 {{produced}}", { fontSize: 6 }),
    text(2, 19.5, 24, 3.4, "保质期至 {{shelf}}", { fontSize: 6 }),
    qr(29, 15.5, 12, "{{code}}"),
    bar(2, 23.2, 25, 5.2, "{{code}}", { showText: false }),
    text(2, 28.2, 25, 1.6, "{{code}}", { fontSize: 4, fontFamily: "Consolas" }),
  ],
});

/** 线缆标签 — 30 × 15 */
export const cableTag = tpl({
  id: "tpl_cable_30x15",
  name: "线缆标签",
  desc: "编号 + 规格 + 走向，弱电与机房常用",
  category: "industrial",
  w: 30,
  h: 15,
  vars: [
    v("id", "线缆编号", "CAB-A12-07"),
    v("spec", "规格", "CAT6 UTP"),
    v("from", "起始端", "机房 A 柜 12U"),
    v("to", "终止端", "3F-207 工位"),
  ],
  elements: [
    box(0, 0, 30, 1.6, { fill: "#111111", stroke: "transparent", strokeWidth: 0 }),
    text(1.5, 2.6, 27, 4.6, "{{id}}", { fontSize: 9, fontWeight: 700, fontFamily: "Consolas" }),
    text(1.5, 7.4, 27, 3, "{{spec}}", { fontSize: 5.8, color: MUTED }),
    rule(1.5, 10.4, 27, { strokeWidth: 0.2 }),
    text(1.5, 11, 27, 3.4, "{{from}} → {{to}}", { fontSize: 5.2, color: "#333333" }),
    box(0, 13.4, 30, 1.6, { fill: "#111111", stroke: "transparent", strokeWidth: 0 }),
  ],
});

/** 箱唛 — 100 × 100 */
export const cartonMark = tpl({
  id: "tpl_carton_100x100",
  name: "外箱唛头",
  desc: "目的地大字 + 箱号 + 条码，仓库分拣用",
  category: "logistics",
  w: 100,
  h: 100,
  vars: [
    v("dest", "目的地", "上海 · 浦东"),
    v("warehouse", "收货仓", "WH-SH-02"),
    v("boxNo", "箱号", "12 / 48"),
    v("po", "订单号", "PO-2026-1108-0031"),
    v("sku", "物料", "MOTOR-220V-B"),
    v("qty", "数量", "24 PCS"),
    v("weight", "毛重", "18.6 KG"),
  ],
  elements: [
    box(0, 0, 100, 34, { fill: "#111111", stroke: "transparent", strokeWidth: 0 }),
    text(4, 4, 60, 12, "{{dest}}", { fontSize: 26, fontWeight: 700, color: "#ffffff" }),
    text(4, 17, 60, 5, "{{warehouse}}", { fontSize: 9, color: "#cfcfcf", letterSpacing: 0.6 }),
    text(64, 5, 32, 10, "{{boxNo}}", {
      fontSize: 20,
      fontWeight: 700,
      color: "#ffffff",
      align: "right",
      fontFamily: "Consolas",
    }),
    text(64, 16, 32, 5, "箱号 BOX", { fontSize: 6.5, color: "#cfcfcf", align: "right", letterSpacing: 1 }),

    bar(6, 40, 88, 22, "{{po}}"),
    text(6, 63, 88, 4, "{{po}}", { fontSize: 8, align: "center", fontFamily: "Consolas", letterSpacing: 1 }),

    rule(4, 70, 92, { strokeWidth: 0.4 }),
    text(4, 72.5, 20, 4, "物料", { fontSize: 6.5, color: MUTED }),
    text(4, 76.5, 60, 6, "{{sku}}", { fontSize: 11, fontWeight: 600, fontFamily: "Consolas" }),
    text(66, 72.5, 30, 4, "数量", { fontSize: 6.5, color: MUTED, align: "right" }),
    text(66, 76.5, 30, 6, "{{qty}}", { fontSize: 11, fontWeight: 600, align: "right", fontFamily: "Consolas" }),
    text(4, 85, 30, 4, "毛重 {{weight}}", { fontSize: 7, color: "#333333" }),
    text(4, 92, 92, 4, "小心轻放 · 防潮防晒 · 请勿倒置", {
      fontSize: 7,
      align: "center",
      color: MUTED,
      letterSpacing: 1,
    }),
  ],
});

/** 服装吊牌 — 50 × 90 */
export const hangTag = tpl({
  id: "tpl_hangtag_50x90",
  name: "服装吊牌",
  desc: "品牌、款号、尺码与价格，竖版吊牌",
  category: "retail",
  w: 50,
  h: 90,
  vars: [
    v("brand", "品牌", "NORTHWIND"),
    v("series", "系列", "2026 秋冬 · 城市机能"),
    v("style", "款号", "NW-2610-08"),
    v("size", "尺码", "L"),
    v("color", "颜色", "石墨黑"),
    v("price", "吊牌价", "699"),
    v("code", "条码", "8801234567893"),
  ],
  elements: [
    text(4, 6, 42, 6, "{{brand}}", { fontSize: 12, fontWeight: 700, letterSpacing: 2.4, align: "center" }),
    text(4, 12, 42, 3.6, "{{series}}", { fontSize: 5.8, color: MUTED, align: "center" }),
    rule(10, 18, 30, { strokeWidth: 0.3 }),

    text(4, 24, 20, 4, "尺码", { fontSize: 6, color: MUTED, align: "center" }),
    text(4, 27.5, 20, 20, "{{size}}", { fontSize: 40, fontWeight: 700, align: "center", fontFamily: "Consolas" }),
    text(4, 49, 20, 3.6, "SIZE", { fontSize: 5.4, color: MUTED, align: "center", letterSpacing: 2 }),

    text(26, 25, 20, 4, "颜色", { fontSize: 6, color: MUTED }),
    text(26, 28.5, 20, 4, "{{color}}", { fontSize: 7.5 }),
    text(26, 34.5, 20, 4, "款号", { fontSize: 6, color: MUTED }),
    text(26, 38, 20, 4, "{{style}}", { fontSize: 6.6, fontFamily: "Consolas" }),

    rule(4, 56, 42, { strokeWidth: 0.25 }),
    text(4, 58, 20, 4, "吊牌价", { fontSize: 6, color: MUTED }),
    text(4, 62, 42, 11, "¥ {{price}}", { fontSize: 22, fontWeight: 700, fontFamily: "Consolas" }),
    bar(5, 74, 40, 9, "{{code}}", { showText: false, format: "ean13" }),
    text(4, 83.5, 42, 3, "{{code}}", { fontSize: 4.4, align: "center", fontFamily: "Consolas" }),
  ],
});

/** 托盘标 — 100 × 150 */
export const palletLabel = tpl({
  id: "tpl_pallet_100x150",
  name: "托盘标签",
  desc: "大二维码 + 批次明细表，整托入库",
  category: "warehouse",
  w: 100,
  h: 150,
  vars: [
    v("material", "物料名称", "伺服电机 750W"),
    v("batch", "批次号", "B20261108-07"),
    v("qty", "数量", "48"),
    v("unit", "单位", "PCS"),
    v("supplier", "供应商", "汇川技术"),
    v("date", "入库日期", "2026-11-08"),
    v("code", "二维码内容", "PLT:B20261108-07"),
    v("items", "明细行", "", { kind: "text" }),
  ],
  elements: [
    box(0, 0, 100, 12, { fill: "#111111", stroke: "transparent", strokeWidth: 0 }),
    text(3, 2.6, 60, 7, "{{supplier}}", { fontSize: 11, color: "#ffffff", fontWeight: 600 }),
    text(66, 3.3, 31, 6, "托盘标签 / PALLET", {
      fontSize: 6,
      color: "#ffffff",
      align: "right",
      letterSpacing: 1,
    }),
    qr(6, 17, 42, "{{code}}"),
    text(52, 18, 44, 4, "物料", { fontSize: 6.5, color: MUTED }),
    text(52, 21.5, 44, 10, "{{material}}", { fontSize: 11, fontWeight: 700, lineHeight: 1.3, valign: "top" }),
    text(52, 32, 44, 4, "批次", { fontSize: 6.5, color: MUTED }),
    text(52, 35.5, 44, 6, "{{batch}}", { fontSize: 9, fontFamily: "Consolas" }),
    text(52, 42, 44, 4, "入库", { fontSize: 6.5, color: MUTED }),
    text(52, 45.5, 44, 5, "{{date}}", { fontSize: 8 }),

    text(6, 60, 30, 4, "数量", { fontSize: 6.5, color: MUTED }),
    text(6, 63.5, 44, 12, "{{qty}} {{unit}}", { fontSize: 20, fontWeight: 700, fontFamily: "Consolas" }),

    rule(3, 78, 94, { strokeWidth: 0.4 }),
    table(3, 81, 94, {
      columns: [
        { title: "序号", field: "no", width: 14 },
        { title: "物料编码", field: "sku", width: 34 },
        { title: "规格", field: "spec", width: 26 },
        { title: "数量", field: "qty", width: 26 },
      ],
      rows: 6,
      rowHeight: 8,
      headerHeight: 8,
      fontSize: 7,
      borderWidth: 0.25,
      headerBg: "#f2f2f2",
      striped: true,
      source: "items",
    }),
    text(3, 139, 94, 4, "第 1 托 / 共 1 托 · {{date}}", {
      fontSize: 6.5,
      color: MUTED,
      align: "center",
    }),
  ],
});
