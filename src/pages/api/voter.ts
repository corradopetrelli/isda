import { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import { PrismaClient } from "@prisma/client";
import { base64ToArrayBuffer, mimeFromBase64 } from "utils/image";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const supabase = createPagesServerClient({ req, res });
    const session = await supabase.auth.getSession();
    const prisma = new PrismaClient();

    if (session) {
      const voter = await prisma.voter.create({
        data: {
          name: req.body.name,
          type: req.body.type,
        },
      });

      if (req.body.image) {
        const imageType = mimeFromBase64(req.body.image);
        const imageBuffer = base64ToArrayBuffer(req.body.image);

        const image = await supabase.storage
          .from(process.env.SUPABASE_STORAGE_VOTERS_IMAGES_BUCKET as string)
          .upload(`${voter.id}.${imageType?.ext}`, imageBuffer, {
            contentType: imageType?.mime,
          });

        await prisma.voter.update({
          where: {
            id: voter.id,
          },
          data: {
            image: image.data?.path,
          },
        });
      }

      res.status(200).json(voter);
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
