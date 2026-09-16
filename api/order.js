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


        /*
        =========================
        整理客户输入
        =========================
        */

        // 姓名：
        // 去除前后空格
        // 转成小写
        // 连续多个空格变成一个
        const inputName = String(name)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");

        // 电话：
        // 只保留数字
        const inputPhone = String(phone)
            .replace(/\D/g, "");


        /*
        =========================
        从 Airtable 获取订单
        =========================
        */

        const url =
            `https://api.airtable.com/v0/${baseId}/${tableId}` +
            `?pageSize=100`;

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {

            const errorText = await response.text();

            console.error(
                "Airtable Error:",
                response.status,
                errorText
            );

            return res.status(500).json({
                success: false,
                message: "无法连接订单系统"
            });
        }


        const data = await response.json();


        /*
        =========================
        寻找订单
        =========================
        */

        const matchedRecord = data.records.find(record => {

            const fields = record.fields;

            const airtableName =
                String(fields["Customer Name"] || "")
                .trim()
                .toLowerCase()
                .replace(/\s+/g, " ");

            const airtablePhone =
                String(fields["Phone"] || "")
                .replace(/\D/g, "");

            return (
                airtableName === inputName &&
                airtablePhone === inputPhone
            );
        });


        /*
        =========================
        找不到订单
        =========================
        */

        if (!matchedRecord) {

            return res.status(404).json({
                success: false,
                message: "找不到订单，请检查姓名和手机号码"
            });
        }


        const fields = matchedRecord.fields;


        /*
        =========================
        Status 中文转换
        =========================
        */

        const statusMap = {

            "Shipped":
                "已发货",

            "Pending for Shipment":
                "尚未发货"

        };


        const status =
            statusMap[fields["Status"]] ||
            fields["Status"] ||
            "未知";


        /*
        =========================
        返回订单
        =========================
        */

        return res.status(200).json({

            success: true,

            order: {

                orderNo:
                    fields["Order No"] || "",

                name:
                    fields["Customer Name"] || "",

                phone:
                    fields["Phone"] || "",

                status:
                    status,

                trackingNo:
                    fields["Tracking No"] || ""

            }

        });


    } catch (error) {

        console.error(
            "Order API Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "系统发生错误，请稍后再试"
        });

    }
}
