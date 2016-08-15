defmodule Perf.Resource.Suite do
  use Perf.Resource
  alias Perf.User

  defimpl Perf.Resource.Create, for: Perf.Suite do
    use Perf.Resource
    stage :check_auth, mod: Perf.Resource.Suite
    stage :create, mod: Perf.Resource.CreateAny
  end



  def check_auth(_, %State{socket: socket, params: params} = state) do
    IO.puts "Checking auth #{inspect socket.assigns}"
    case socket.assigns do
      %{user: %User{} = user} ->
        params = Map.put(params, "user_id", user.id)
        IO.inspect params
        struct(state, params: params)
      _ -> forbidden(state)
    end
  end

end