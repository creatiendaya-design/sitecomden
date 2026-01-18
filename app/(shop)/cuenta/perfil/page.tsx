import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const metadata = {
  title: "Mi Perfil",
};

export default async function PerfilPage() {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Mi Perfil</h2>
        <p className="text-muted-foreground">
          Información de tu cuenta
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información personal</CardTitle>
          <CardDescription>
            Administra tu información desde Clerk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-20 w-20",
                },
              }}
            />
            <div>
              <p className="text-xl font-bold">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-sm text-muted-foreground">
                Usuario de ShopGood
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Email</p>
                <p className="text-muted-foreground">
                  {user.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>

            {user.primaryPhoneNumber && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Teléfono</p>
                  <p className="text-muted-foreground">
                    {user.primaryPhoneNumber.phoneNumber}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Miembro desde</p>
                <p className="text-muted-foreground">
                  {format(new Date(user.createdAt), "d 'de' MMMM 'de' yyyy", {
                    locale: es,
                  })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}