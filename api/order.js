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

        // 姓名：无视大小写、前后空格、多余空格
        const inputName = String(name)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");

        // 电话：只保留数字
        const inputPhone = String(phone)
            .replace(/\D/g, "");


        /*
        =========================
        读取 Airtable
        =========================
        */

        let allRecords = [];
        let offset = null;

        do {

            let url =
                `https://api.airtable.com/v0/${baseId}/${tableId}?pageSize=100`;

            if (offset) {
                url += `&offset=${encodeURIComponent(offset)}`;
            }

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

            allRecords =
                allRecords.concat(data.records || []);

            offset =
                data.offset || null;

        } while (offset);



        /*
        =========================
        找出这个客户的所有订单
        =========================
        */

        const matchedRecords = allRecords.filter(record => {

            const fields =
                record.fields || {};


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

        if (matchedRecords.length === 0) {

            return res.status(404).json({
                success: false,
                message: "找不到订单，请检查姓名和手机号码"
            });

        }



        /*
        =========================
        Status 翻译
        =========================
        */

        const statusMap = {

            "Shipped":
                "已发货",

            "Pending for Shipment":
                "尚未发货"

        };



        /*
        =========================
        转换成订单 Array
        =========================
        */

        const orders = matchedRecords.map(record => {

            const fields =
                record.fields || {};


            const status =
                statusMap[fields["Status"]] ||
                fields["Status"] ||
                "未知";


            return {

                orderNo:
                    fields["Order No"] || "",

                orderDate:
                    fields["Order Date"] || "",

                name:
                    fields["Customer Name"] || "",

                phone:
                    fields["Phone"] || "",

                status:
                    status,

                trackingNo:
                    fields["Tracking No"] || ""

            };

        });



        /*
        =========================
        最新订单排最上面
        =========================
        */

        orders.sort((a, b) => {

            const dateA =
                new Date(a.orderDate);

            const dateB =
                new Date(b.orderDate);


            if (
                !isNaN(dateA) &&
                !isNaN(dateB)
            ) {

                return dateB - dateA;

            }


            // 日期一样时，用订单号倒序
            return String(b.orderNo)
                .localeCompare(
                    String(a.orderNo),
                    undefined,
                    {
                        numeric: true
                    }
                );

        });



        /*
        =========================
        返回所有订单
        =========================
        */

        return res.status(200).json({

            success: true,

            count:
                orders.length,

            orders:
                orders

        });


    } catch (error) {

        console.error(
            "Order API Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "系统发生错误，请稍后再试"

        });

    }
}
