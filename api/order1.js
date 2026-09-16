export default async function handler(req, res) {
    try {
        const { name, phone } = req.query;

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: "请输入姓名和手机号码"
            });
        }

        const token = process.env.AIRTABLE_TOKEN;
        const baseId = process.env.AIRTABLE_BASE_ID;

        const tableId = "tblqWWGqeLWDmKHrl";

        if (!token || !baseId) {
            return res.status(500).json({
                success: false,
                message: "服务器配置错误"
            });
        }

        // 防止特殊字符影响 Airtable 查询
        const safeName = name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        const safePhone = phone.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

        const formula = `AND(LOWER({Customer Name})=LOWER("${safeName}"),{Phone}="${safePhone}")`;

        const url =
            `https://api.airtable.com/v0/${baseId}/${tableId}?` +
            new URLSearchParams({
                filterByFormula: formula,
                maxRecords: "1"
            });

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();

            console.error("Airtable Error:", errorText);

            return res.status(500).json({
                success: false,
                message: "无法连接订单系统"
            });
        }

        const data = await response.json();

        if (!data.records || data.records.length === 0) {
            return res.status(404).json({
                success: false,
                message: "找不到订单，请检查姓名和手机号码"
            });
        }

        const fields = data.records[0].fields;

        // 把 Airtable 的英文状态转换成中文
        const statusMap = {
            "Shipped": "已发货",
            "Pending for Shipment": "尚未发货"
            
        };

        const status =
            statusMap[fields["Status"]] ||
            fields["Status"] ||
            "未知";

        return res.status(200).json({
            success: true,
            order: {
                orderNo: fields["Order No"] || "",
                name: fields["Customer Name"] || "",
                phone: fields["Phone"] || "",
                status: status,
                trackingNo: fields["Tracking No"] || ""
            }
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "系统发生错误，请稍后再试"
        });
    }
}
