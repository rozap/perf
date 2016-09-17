defmodule Perf.Resource.Session do
  defimpl Perf.Resource.Create, for: Perf.Session do
    use Perf.Resource
    alias Perf.{Repo, User, Session}
    import Ecto.Query


    def gen_session(state, %User{password: hashed_pass} = user, password) do
      if Comeonin.Pbkdf2.checkpw(password, hashed_pass) do
        {:ok, token, _claims} = Guardian.encode_and_sign(user, :token)
        created(state, %Session{token: token, user: user})
      else
        value_error(state, %{password: ["is incorrect"]})
      end
    end

    def handle(model, state) do
      case Perf.Session.validate(state.params) do
        {:ok, %{"email" => email, "password" => password}} ->
          query = from u in User, where: u.email == ^email
          case Repo.one(query) do
            nil -> value_error(state, %{email: ["does not exist"]})
            user -> gen_session(state, user, password)
          end
        {:error, reason} -> internal_error(state, reason)
      end
    end
  end

  defimpl Perf.Resource.Delete, for: Perf.Session do
    use Perf.Resource
    alias Perf.{Repo, User, Session}
    import Ecto.Query
    import Guardian.Phoenix.Socket
    alias Perf.Resource.State

    on(%{"token" => token}) do
      case Guardian.revoke!(token) do
        _ -> ok(state, %{})
      end
    end
  end

  defimpl Perf.Resource.Read, for: Perf.Session do
    use Perf.Resource

    on(%{"token" => token}) do
      case Guardian.decode_and_verify(token) do
        {:ok, %{"aud" => "User:" <> uid} = claims} ->
          user = Repo.get(User, uid)
          socket = Phoenix.Socket.assign(state.socket, :user, user)

          state
          |> struct(socket: socket)
          |> ok(%{
            token: claims,
            user: user
          })
        {:error, :token_not_found} ->
          not_found(state, "expired")
        {:error, reason} ->
          internal_error(state, reason)
      end
    end

  end
end